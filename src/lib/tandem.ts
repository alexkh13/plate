// src/server/lib/tandem.ts
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { jwtDecode } from 'jwt-decode';
import * as zlib from 'zlib';
import { Buffer } from 'node:buffer';

// --- Interfaces for Pump Events ---
export interface BaseEvent {
  id: number;
  name: string;
  seqNum: number;
  eventTimestamp: Date;
}

export interface RawEvent {
  timestamp: Date;
  seqNum: number;
  id: number;
}

export enum BasalRateChangeType {
  TimedSegment = 0,
  NewProfile = 1,
  TempRateStart = 2,
  TempRateEnd = 3,
  PumpSuspended = 4,
  PumpResumed = 5,
  PumpShutDown = 6,
  BasalLimit = 7,
}

export interface LidBasalRateChange extends BaseEvent {
  commandedbasalrate: number; // units/hour
  basebasalrate: number; // units/hour
  maxbasalrate: number; // units/hour
  IDP: number;
  changetype: BasalRateChangeType;
}

export enum BolusCompletionStatus {
  UserAborted = 0,
  TerminatedByAlarm = 1,
  TerminatedByMalfunction = 2,
  Completed = 3,
  BolusRejected = 5,
  AbortedByPlgs = 6,
}

export interface LidBolusCompleted extends BaseEvent {
  completionstatus: BolusCompletionStatus;
  bolusid: number;
  insulindelivered: number; // units
  insulinrequested: number; // units
  IOB: number; // units
}

export interface LidCgmData extends BaseEvent {
  glucoseValueStatus: number;
  cgmDataType: number;
  rate: number;
  algorithmState: number;
  rssi: number;
  currentGlucoseDisplayValue: number; // mg/dL
  egvTimestamp: Date;
  egvInfoBitmask: number;
  interval: number;
}

// --- Configuration & Constants ---

const LOGIN_PAGE_URL = 'https://sso.tandemdiabetes.com/';

const _US_URLS = {
    LOGIN_API_URL: 'https://tdcservices.tandemdiabetes.com/accounts/api/login',
    TDC_OAUTH_AUTHORIZE_URL: 'https://tdcservices.tandemdiabetes.com/accounts/api/oauth2/v1/authorize',
    TDC_OIDC_JWKS_URL: 'https://tdcservices.tandemdiabetes.com/accounts/api/.well-known/openid-configuration/jwks',
    TDC_OIDC_ISSUER: 'https://tdcservices.tandemdiabetes.com/accounts/api',
    TDC_OIDC_CLIENT_ID: '0oa27ho9tpZE9Arjy4h7',
    SOURCE_URL: 'https://source.tandemdiabetes.com/',
    REDIRECT_URI: 'https://sso.tandemdiabetes.com/auth/callback',
    TOKEN_ENDPOINT: 'https://tdcservices.tandemdiabetes.com/accounts/api/connect/token',
    AUTHORIZATION_ENDPOINT: 'https://tdcservices.tandemdiabetes.com/accounts/api/connect/authorize',
};

const _EU_URLS = {
    LOGIN_API_URL: 'https://tdcservices.eu.tandemdiabetes.com/accounts/api/login',
    TDC_OAUTH_AUTHORIZE_URL: 'https://tdcservices.eu.tandemdiabetes.com/accounts/api/oauth2/v1/authorize',
    TDC_OIDC_JWKS_URL: 'https://tdcservices.eu.tandemdiabetes.com/accounts/api/.well-known/openid-configuration/jwks',
    TDC_OIDC_ISSUER: 'https://tdcservices.eu.tandemdiabetes.com/accounts/api',
    TDC_OIDC_CLIENT_ID: '1519e414-eeec-492e-8c5e-97bea4815a10',
    SOURCE_URL: 'https://source.eu.tandemdiabetes.com/',
    REDIRECT_URI: 'https://source.eu.tandemdiabetes.com/authorize/callback',
    TOKEN_ENDPOINT: 'https://tdcservices.eu.tandemdiabetes.com/accounts/api/connect/token',
    AUTHORIZATION_ENDPOINT: 'https://tdcservices.eu.tandemdiabetes.com/accounts/api/connect/authorize',
};

// Headers that mimic the mobile app to ensure requests are accepted
const DEFAULT_HEADERS = {
  'User-Agent': 'Tandem/2.5.1 (iPhone; iOS 14.0; Scale/2.00)',
  'Accept-Language': 'en-US;q=1, en-GB;q=0.9',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept': 'application/json',
};

const EVENT_LEN = 26;
const TANDEM_EPOCH = 1199145600;

function parseRawEvent(buffer: Buffer): RawEvent {
  const source_and_id = buffer.readUInt16BE(0);
  const id = source_and_id & 0x0FFF;
  const timestampRaw = buffer.readUInt32BE(2);
  const timestamp = new Date((TANDEM_EPOCH + timestampRaw) * 1000);
  const seqNum = buffer.readUInt32BE(6);

  return { id, seqNum, timestamp };
}

function parseLidBasalRateChange(raw: RawEvent, buffer: Buffer): LidBasalRateChange {
  return {
    ...raw,
    name: "LID_BASAL_RATE_CHANGE",
    eventTimestamp: raw.timestamp,
    commandedbasalrate: buffer.readFloatBE(10),
    basebasalrate: buffer.readFloatBE(14),
    maxbasalrate: buffer.readFloatBE(18),
    IDP: buffer.readUInt16BE(24),
    changetype: buffer.readUInt8(23),
  };
}

function parseLidBolusCompleted(raw: RawEvent, buffer: Buffer): LidBolusCompleted {
  return {
    ...raw,
    name: "LID_BOLUS_COMPLETED",
    eventTimestamp: raw.timestamp,
    completionstatus: buffer.readUInt16BE(12),
    bolusid: buffer.readUInt16BE(10),
    insulindelivered: buffer.readFloatBE(18),
    insulinrequested: buffer.readFloatBE(22),
    IOB: buffer.readFloatBE(14),
  };
}

function parseLidCgmData(raw: RawEvent, buffer: Buffer): LidCgmData {
  const timestampRaw = buffer.readUInt32BE(18); // EGV TimeStamp at offset 8 + 10 = 18
  const egvTimestamp = new Date((TANDEM_EPOCH + timestampRaw) * 1000);

  let name = "LID_CGM_DATA_GXB";
  if (raw.id === 399) name = "LID_CGM_DATA_G7";
  if (raw.id === 372) name = "LID_CGM_DATA_FSL2";

  return {
    ...raw,
    name,
    eventTimestamp: egvTimestamp, // Use EGV timestamp as the main event timestamp
    rate: buffer.readInt8(10), // Rate at offset 0 + 10 = 10
    cgmDataType: buffer.readUInt8(11), // CGM Data Type at offset 1 + 10 = 11
    glucoseValueStatus: buffer.readUInt16BE(12), // glucoseValueStatus at offset 2 + 10 = 12
    currentGlucoseDisplayValue: buffer.readUInt16BE(14), // currentGlucoseDisplayValue at offset 4 + 10 = 14
    rssi: buffer.readInt8(16), // RSSI at offset 6 + 10 = 16
    algorithmState: buffer.readUInt8(17), // AlgorithmState at offset 7 + 10 = 17
    egvTimestamp,
    interval: buffer.readUInt8(23), // Interval at offset 13 + 10 = 23
    egvInfoBitmask: buffer.readUInt16BE(24), // EGV Info Bitmask at offset 14 + 10 = 24
  };
}

const eventParsers: { [key: number]: (raw: RawEvent, buffer: Buffer) => BaseEvent } = {
  3: parseLidBasalRateChange,
  20: parseLidBolusCompleted,
  256: parseLidCgmData, // LID_CGM_DATA_GXB
  399: parseLidCgmData, // LID_CGM_DATA_G7
  372: parseLidCgmData, // LID_CGM_DATA_FSL2
};

function parseEvent(buffer: Buffer): BaseEvent | null {
  const rawEvent = parseRawEvent(buffer);
  const parser = eventParsers[rawEvent.id];
  if (parser) {
    return parser(rawEvent, buffer);
  }
  return null;
}

/**
 * A TypeScript client for the Tandem t:connect API.
 * Based on the logic found in jwoglom/tconnectsync.
 */
export class TConnectClient {
  private email: string;
  // We store the password only briefly to login; in a real app, handle secrets securely
  private password?: string;
  private axiosInstance: AxiosInstance;
  private token: string | null = null;
  public pumperId: string | null = null;
  private regionUrls: typeof _US_URLS;
  private loginAxiosInstance: AxiosInstance;

  constructor(email: string, password?: string, region: 'US' | 'EU' = 'US') {
    this.email = email;
    this.password = password;
    this.regionUrls = region === 'EU' ? _EU_URLS : _US_URLS;
    
    // axiosInstance for general API calls after authentication
    this.axiosInstance = axios.create({
      baseURL: this.regionUrls.SOURCE_URL,
      headers: DEFAULT_HEADERS,
      timeout: 30000, // 30s timeout
    });

    // Add interceptor to inject token if available
    this.axiosInstance.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // A separate axios instance for login steps to manage cookies
    const cookieJar = new CookieJar();
    this.loginAxiosInstance = wrapper(axios.create({
        jar: cookieJar,
        withCredentials: true, // Important for cookie management across login steps
        headers: {
            ...DEFAULT_HEADERS // Merge with default headers, though some might be overridden
        },
        timeout: 30000,
    }));
  }

  /**
   * Authenticates with the t:connect cloud.
   * If a password was provided in constructor, uses it.
   * Otherwise, you must pass it here.
   */
  public async login(passwordOverride?: string): Promise<void> {
    const password = passwordOverride || this.password;
    if (!password) {
      throw new Error('Password is required for login.');
    }

    try {
        // Step 1: Initial GET to LOGIN_PAGE_URL to get cookies
        await this.loginAxiosInstance.get(LOGIN_PAGE_URL);

        // Step 2: POST to LOGIN_API_URL with username and password
        const loginPayload = {
            username: this.email,
            password: password,
        };

        const loginResponse = await this.loginAxiosInstance.post(this.regionUrls.LOGIN_API_URL, loginPayload, {
            headers: {
                'Content-Type': 'application/json',
                'Referer': LOGIN_PAGE_URL,
            },
            maxRedirects: 0, // Prevent axios from following redirects automatically
            validateStatus: status => status >= 200 && status < 400 || status === 401, // Don't throw on 401
        });
        
        if (loginResponse.status !== 200) {
            throw new Error(`Login API failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.data)}`);
        }

        // PKCE Flow
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);

        // Step 3: OIDC Step 1 (Authorization Request)
        const authorizeUrl = new URL(this.regionUrls.AUTHORIZATION_ENDPOINT);
        authorizeUrl.searchParams.append('client_id', this.regionUrls.TDC_OIDC_CLIENT_ID);
        authorizeUrl.searchParams.append('response_type', 'code');
        authorizeUrl.searchParams.append('scope', 'openid profile email');
        authorizeUrl.searchParams.append('redirect_uri', this.regionUrls.REDIRECT_URI);
        authorizeUrl.searchParams.append('code_challenge', codeChallenge);
        authorizeUrl.searchParams.append('code_challenge_method', 'S256');

        const authorizeResponse = await this.loginAxiosInstance.get(authorizeUrl.toString(), {
            headers: {
                'Referer': LOGIN_PAGE_URL,
            },
        });

        if (authorizeResponse.status !== 200) { // Expect a 200 after redirects
             throw new Error(`Authorization request failed with status ${authorizeResponse.status}: ${JSON.stringify(authorizeResponse.data)}`);
        }
        
        const redirectUrl = new URL(authorizeResponse.request.res.responseUrl);
        let code = redirectUrl.searchParams.get('code');

        if (!code) {
            const returnUrl = redirectUrl.searchParams.get('ReturnUrl');
            if (!returnUrl) {
                throw new Error('No ReturnUrl or code found in authorization redirect URL');
            }
            
            const authorizeResponseStep2 = await this.loginAxiosInstance.get(returnUrl, {
                headers: {
                    'Referer': LOGIN_PAGE_URL,
                },
            });

            if (authorizeResponseStep2.status !== 200) { // Expect a 200 after redirects
                throw new Error(`Authorization step 2 request failed with status ${authorizeResponseStep2.status}: ${JSON.stringify(authorizeResponseStep2.data)}`);
            }
            
            const finalRedirectUrl = new URL(authorizeResponseStep2.request.res.responseUrl);
            code = finalRedirectUrl.searchParams.get('code');
        }

        if (!code) {
            throw new Error('No code found in authorization redirect URL');
        }

        // Step 4: OIDC Step 2 (Token Request)
        const tokenPayload = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: this.regionUrls.TDC_OIDC_CLIENT_ID,
            code: code,
            redirect_uri: this.regionUrls.REDIRECT_URI,
            code_verifier: codeVerifier,
        });

        const tokenResponse = await this.loginAxiosInstance.post(this.regionUrls.TOKEN_ENDPOINT, tokenPayload.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        
        const oidcJson = tokenResponse.data;

        if (!oidcJson.access_token || !oidcJson.id_token) {
            throw new Error('Missing access_token or id_token in OIDC token response');
        }

        this.token = oidcJson.access_token;
        
        // Decode ID token to get user details
        const decodedIdToken: any = jwtDecode(oidcJson.id_token);
        this.pumperId = decodedIdToken.pumperId;

        console.log('Logged in successfully.');
    } catch (error: any) {
        console.error('Login failed:', error);
        throw new Error('Failed to authenticate with Tandem Source');
    }
  }

  public async pump_event_metadata(): Promise<any> {
    this.ensureAuthenticated();
    const url = `/api/reports/reportsfacade/${this.pumperId}/pumpeventmetadata`;
    try {
      const response = await this.axiosInstance.get(url, {
        headers: {
            'Origin': this.regionUrls.SOURCE_URL,
            'Referer': this.regionUrls.SOURCE_URL + '/',
        }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching pump event metadata: ${error.message}`);
      throw error;
    }
  }

  public async pump_events(tconnectDeviceId: string, startDate: Date, endDate: Date): Promise<(BaseEvent | null)[]> {
    this.ensureAuthenticated();

    // API expects MM-DD-YYYY format
    const startStr = this.formatDate(startDate);
    const endStr = this.formatDate(endDate);

    const url = `/api/reports/reportsfacade/pumpevents/${this.pumperId}/${tconnectDeviceId}?minDate=${startStr}&maxDate=${endStr}`;
    
    try {
      const response = await this.axiosInstance.get(url, {
        responseType: 'text',
        headers: {
            'Origin': this.regionUrls.SOURCE_URL,
            'Referer': this.regionUrls.SOURCE_URL + '/',
        }
      });
      
      return this.decodeRawEvents(response.data);
    } catch (error: any) {
      console.error(`Error fetching pump events: ${error.message}`);
      throw error;
    }
  } 
  
  private ensureAuthenticated() {
    if (!this.token || !this.pumperId) {
      throw new Error('Client is not authenticated. Call login() first.');
    }
  }

  private formatDate(date: Date): string {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  }

  private generateCodeVerifier(): string {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return this.base64URLEncode(randomBytes);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const verifierBytes = new TextEncoder().encode(verifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', verifierBytes);
    return this.base64URLEncode(new Uint8Array(hashBuffer));
  }

  private base64URLEncode(buf: Uint8Array): string {
    return btoa(String.fromCharCode(...buf))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private decodeRawEvents(raw: string): (BaseEvent | null)[] {
    const decoded = Buffer.from(raw, 'base64');
    let inflated: Buffer;
    try {
      inflated = zlib.inflateSync(decoded);
    } catch (e) {
      inflated = decoded;
    }
    const events: (BaseEvent | null)[] = [];

    for (let i = 0; i < inflated.length; i += EVENT_LEN) {
      const chunk = inflated.slice(i, i + EVENT_LEN);
      if (chunk.length < EVENT_LEN) {
        continue;
      }
      events.push(parseEvent(chunk));
    }
    return events;
  }
}
