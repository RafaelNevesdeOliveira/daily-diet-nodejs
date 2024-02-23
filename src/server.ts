import { env } from './env/index'
import { app } from './app'

app
  .listen({
    port: env.PORT,
  })
  .then(() => {
    console.log(`Server running on ${env.PORT}`)
  })
