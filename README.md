# OverView

EventBridge to StepFunctions Example

![overview](./image.jpeg)

# Run

```
$ curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-project-id: hoge" \
  -d '{"message" : "fega"}' \
   {Lambda Function URLs}/task | jq

$ curl -X GET \
  -H "Content-Type: application/json" \
  -H "x-project-id: hoge" \
   {Lambda Function URLs}/task/{id}} | jq
```