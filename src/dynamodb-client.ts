import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  PutCommand,
  PutCommandInput,
} from '@aws-sdk/lib-dynamodb'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { Task } from './type'

dayjs.extend(timezone)
dayjs.extend(utc)

const ddbClient = new DynamoDBClient({ region: 'ap-northeast-1' })

const marshallOptions = {
  convertEmptyValues: false,
  removeUndefinedValues: false,
  convertClassInstanceToMap: false,
}

const unmarshallOptions = {
  wrapNumbers: false,
}
const translateConfig = { marshallOptions, unmarshallOptions }
const ddbdClient = DynamoDBDocumentClient.from(ddbClient, translateConfig)

const tableName: string = 'Task'

export async function createTask(task: Task): Promise<void> {
  try {
    const input: PutCommandInput = {
      TableName: tableName,
      Item: {
        projectId: task.projectId,
        taskId: task.taskId,
        message: task.message,
        createdAt: dayjs().tz('Asia/Tokyo').format(), // ISO8601
      },
    }
    const command = new PutCommand(input)
    await ddbdClient.send(command)
  } catch (err) {
    console.log('ERROR:', err)
  }
}

export async function getTask(projectId: string, taskId: string): Promise<Task | undefined> {
  try {
    const input: GetCommandInput = {
      TableName: tableName,
      Key: {
        projectId: projectId,
        taskId: taskId,
      },
    }
    const data: GetCommandOutput = await ddbdClient.send(new GetCommand(input))
    if (data.Item) {
      console.log('SUCCESS (describe table):', JSON.stringify(data, null, 2))
      return {
        projectId: data.Item.projectId,
        taskId: data.Item.taskId,
        message: data.Item.message,
      }
    } else {
      return undefined
    }
  } catch (err) {
    // エラー適当..
    console.log('ERROR:', err)
    return undefined
  }
}
