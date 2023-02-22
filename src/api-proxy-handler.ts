import serverlessExpress from '@vendia/serverless-express'
import express, { Request, Response } from 'express'
import cors from 'cors'
import { getTask } from './dynamodb-client'
import { ulid } from 'ulid'
import { putTaskEvent } from './eventbridge-client'

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.post('/task', (req: Request, res: Response) => {
  const projectId = req.header('x-project-id')
  const { message } = req.body

  if (projectId != undefined) {
    const taskId = ulid()
    putTaskEvent({ projectId: projectId, taskId: taskId, message: message }).then(() =>
      res.status(200).send({
        item: {
          projectId: projectId,
          taskId: taskId,
        },
      }),
    )
  } else {
    res.status(400).send({
      message: 'x-project-id none.',
    })
  }
})

app.get('/task/:id', (req: Request, res: Response) => {
  const projectId = req.header('x-project-id')
  if (projectId != undefined) {
    getTask(projectId, req.params.id).then((task) => {
      if (task != undefined) {
        console.log('Response Body:', JSON.stringify(task, null, 2))
        res.status(200).send(JSON.stringify(task))
      } else {
        res.status(404).send({
          message: 'taskId none.',
        })
      }
    })
  } else {
    res.status(400).send({
      message: 'x-project-id none.',
    })
  }
})

exports.handler = serverlessExpress({ app })
