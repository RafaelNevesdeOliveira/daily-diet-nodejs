import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'

export async function usersRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string(),
      email: z.string().email(),
    })

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 3600 * 24 * 7, // 7 dias
      })
    }
    try {
      const { name, email } = createUserBodySchema.parse(request.body)

      await knex('users').insert({
        id: randomUUID(),
        name,
        email,
        session_id: sessionId,
      })
      return reply.status(201).send('Usuário Criado')
    } catch (error) {
      if (error instanceof z.ZodError) {
        const emailFormatError = error.issues.find((issue) =>
          issue.path.includes('email'),
        )?.message
        console.log(emailFormatError)
        if (emailFormatError) {
          return reply.status(400).send(emailFormatError)
        }

        return reply.status(500).send('Erro ao criar usuário')
      }
    }
  })
}
