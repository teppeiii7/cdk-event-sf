import { Handler } from 'aws-lambda'
import { TaskEvent } from './type'
import { createTask } from './dynamodb-client'

export const handler: Handler<TaskEvent> = async (event: TaskEvent) => {
  console.log(`Received event: ${JSON.stringify(event)}`)
  await createTask(event.detail)
}
