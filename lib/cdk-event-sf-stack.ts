import { EventBus, EventBusPolicy, Rule } from 'aws-cdk-lib/aws-events'
import { Construct } from 'constructs'
import { Chain, LogLevel, StateMachine } from 'aws-cdk-lib/aws-stepfunctions'
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Architecture, FunctionUrlAuthType, HttpMethod, Runtime } from 'aws-cdk-lib/aws-lambda'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks'
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets'
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam'

export class CdkEventSfStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const taskTable = new Table(this, `Task`, {
      tableName: `Task`,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'projectId', type: AttributeType.STRING },
      sortKey: { name: 'taskId', type: AttributeType.STRING },
    })

    // Step Functionsから呼ばれるLambda
    // Step Functionsのアクセスポリシーは不要
    const createTaskFunc = new NodejsFunction(this, 'createTaskFunc', {
      runtime: Runtime.NODEJS_18_X,
      functionName: 'createTaskFunc',
      entry: 'src/create-task-handler.ts',
      memorySize: 1024,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(60),
      logRetention: RetentionDays.ONE_DAY,
    })

    taskTable.grantWriteData(createTaskFunc)

    // Step Functions
    const createTaskJob = new LambdaInvoke(this, 'createTaskJob', {
      lambdaFunction: createTaskFunc,
      outputPath: '$.Payload',
    })

    const createTaskStateMachine = new StateMachine(this, 'createTaskStateMachine', {
      stateMachineName: `createTaskStateMachine`,
      definition: Chain.start(createTaskJob),
      logs: {
        destination: new LogGroup(this, 'createTaskStateMachineLogGroup', {
          logGroupName: 'createTaskStateMachineLogGroup',
          removalPolicy: RemovalPolicy.RETAIN,
          retention: RetentionDays.ONE_WEEK,
        }),
        level: LogLevel.ALL,
      },
    })

    // EventBridge
    const asyncCreateTaskEvent = new EventBus(this, 'asyncCreateTaskEvent', {
      eventBusName: 'asyncCreateTaskEvent',
    })

    // https://github.com/aws/aws-cdk/issues/24031
    // PolicyStatementが依存関係エラーするのでJSONから作る
    new EventBusPolicy(this, 'eventBusPolicy', {
      eventBus: asyncCreateTaskEvent,
      statementId: 'statementId',
      statement: new PolicyStatement({
        principals: [new ServicePrincipal('lambda.amazonaws.com')],
        actions: ['events:PutEvents'],
        resources: [asyncCreateTaskEvent.eventBusArn],
      }).toJSON(),
    })

    new Rule(this, 'asyncCreateTaskRule', {
      ruleName: `asyncCreateTaskRule`,
      eventBus: asyncCreateTaskEvent,
      description: `EventBridge to StepFunctions`,
      enabled: true,
      eventPattern: {
        detailType: ['create.task'], // Entries.DetailTypeで指定する
        source: [`api-proxy-handler`], // Entries.Sourceで指定する
      },
      targets: [new SfnStateMachine(createTaskStateMachine)],
    })

    // Lambda Functions URLでAPI公開してEventBridgeを叩くだけのLambda
    const apiProxyFunc = new NodejsFunction(this, 'apiProxyFunc', {
      runtime: Runtime.NODEJS_18_X,
      functionName: 'apiProxyFunc',
      entry: 'src/api-proxy-handler.ts',
      memorySize: 1024,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(60),
      logRetention: RetentionDays.ONE_DAY,
    })

    apiProxyFunc.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
      cors: {
        allowedMethods: [HttpMethod.ALL],
        allowedOrigins: ['*'],
      },
    })

    taskTable.grantReadData(apiProxyFunc)

    // TODO 最小権限にしたい
    apiProxyFunc.role!.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonEventBridgeFullAccess',
    })
  }
}
