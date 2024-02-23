import { randomUUID } from 'node:crypto'
import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.post(
    '/',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const createMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.boolean(),
        date: z.coerce.date(),
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
        const { name, description, isOnDiet, date } =
          createMealBodySchema.parse(request.body)

        await knex('meals').insert({
          id: randomUUID(),
          name,
          description,
          is_on_diet: isOnDiet,
          date: date.getTime(),
          user_id: request.user?.id,
        })
        return reply.status(201).send('Refeição Criada')
      } catch (error) {
        if (!request.user?.id) {
          return reply.status(400).send('Nenhum usuário cadastrado')
        }

        return reply.status(500).send('Erro ao criar refeição')
      }
    },
  )
}
