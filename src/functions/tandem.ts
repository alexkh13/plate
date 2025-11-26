import { createServerFn } from '@tanstack/react-start'
import { TConnectClient, LidBolusCompleted, LidCgmData } from '../lib/tandem'

type TandemInput = {
  email: string
  password: string
  mealTime: string
  region: string
}

export const getBolusEvents = createServerFn({ method: 'POST' })
  .inputValidator((data: TandemInput) => data)
  .handler(async ({ data }) => {
    console.log('Server function getBolusEvents called');
    const { email, password, mealTime: mealTimeStr, region } = data

    if (!email || !password || !mealTimeStr) {
      throw new Error('Missing email, password, or mealTime')
    }

    const mealTime = new Date(mealTimeStr)
    const startDate = new Date(mealTime.getTime() - 4 * 60 * 60 * 1000)
    const endDate = new Date(mealTime.getTime() + 4 * 60 * 60 * 1000)

    console.log('Initializing TConnectClient...');
    const client = new TConnectClient(email, password, region as 'US' | 'EU' || 'EU')
    console.log('Logging in...');
    await client.login()
    console.log('Login successful.');

    if (!client.pumperId) {
      throw new Error('Could not get pumper ID')
    }

    const metadata = await client.pump_event_metadata()
    if (!metadata || metadata.length === 0) {
      throw new Error('Could not get pump metadata')
    }

    const tconnectDeviceId = metadata[0].tconnectDeviceId
    const events = await client.pump_events(tconnectDeviceId, startDate, endDate)

    const filteredEvents = events.filter(
      (event): event is LidBolusCompleted | LidCgmData =>
        event !== null &&
        event.eventTimestamp >= startDate &&
        event.eventTimestamp <= endDate &&
        (
          event.name === 'LID_BOLUS_COMPLETED' ||
          event.name === 'LID_CGM_DATA_GXB' ||
          event.name === 'LID_CGM_DATA_G7' ||
          event.name === 'LID_CGM_DATA_FSL2'
        )
    )

    return filteredEvents
  })
