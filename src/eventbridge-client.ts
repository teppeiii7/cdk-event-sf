import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge'
import { Task } from './type'

export const client = new EventBridgeClient({})

export async function putTaskEvent(detail: Task): Promise<void> {
  const params = {
    Entries: [
      {
        EventBusName: `asyncCreateTaskEvent`,
        Source: 'api-proxy-handler',
        DetailType: 'create.task',
        Detail: JSON.stringify(detail),
      },
    ],
  }
  await client.send(new PutEventsCommand(params))
}
