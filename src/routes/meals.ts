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

      try {
        const { name, description, isOnDiet, date } =
          createMealBodySchema.parse(request.body)

        if (!request.user) {
          return reply.status(400).send('Nenhum usuário cadastrado')
        }

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
        return reply.status(500).send('Erro ao criar refeição')
      }
    },
  )

  app.get(
    '/',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const meals = await knex('meals')
        .where({
          user_id: request.user?.id,
        })
        .orderBy('date', 'desc')
      const mealsData = meals.map((meal) => ({
        ...meal,
        date: new Date(meal.date).toISOString(),
      }))

      return reply.send({
        mealsData,
      })
    },
  )

  app.get(
    '/:mealId',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getMealParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      try {
        const { mealId } = getMealParamsSchema.parse(request.params)

        const meal = await knex('meals')
          .where({
            id: mealId,
          })
          .first()

        if (!meal) {
          return reply.status(404).send('Refeição não encontrada')
        }

        return reply.send({
          meal,
        })
      } catch (error) {
        console.error(error)
        return reply.status(500).send('Erro ao processar a solicitação')
      }
    },
  )

  app.delete(
    '/:mealId',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getMealParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      try {
        const { mealId } = getMealParamsSchema.parse(request.params)

        const meal = await knex('meals')
          .where({
            id: mealId,
          })
          .first()

        if (!meal) {
          return reply.status(404).send('Refeição não encontrada')
        }
        await knex('meals')
          .where({
            id: mealId,
          })
          .delete()

        return reply.status(204).send()
      } catch (error) {
        return reply.status(500).send('Erro ao processar a solicitação')
      }
    },
  )

  app.put(
    '/:mealId',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const paramsSchema = z.object({ mealId: z.string().uuid() })

      const { mealId } = paramsSchema.parse(request.params)

      const createMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnDiet: z.boolean(),
        date: z.coerce.date(),
      })

      try {
        const { name, description, isOnDiet, date } =
          createMealBodySchema.parse(request.body)

        const meal = await knex('meals').where({ id: mealId }).first()

        if (!meal) {
          return reply.status(404).send({ error: 'Meal not found' })
        }

        await knex('meals').update({
          name,
          description,
          is_on_diet: isOnDiet,
          date: date.getTime(),
        })
        return reply.status(204).send('Refeição editada')
      } catch (error) {
        return reply.status(500).send('Erro ao criar refeição')
      }
    },
  )

  app.get(
    '/metrics',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const totalMealsOnDiet = await knex('meals')
        .where({ user_id: request.user?.id, is_on_diet: true })
        .count('id', { as: 'total' })
        .first()

      const totalMealsOffDiet = await knex('meals')
        .where({ user_id: request.user?.id, is_on_diet: false })
        .count('id', { as: 'total' })
        .first()

      const totalMeals = await knex('meals')
        .where({ user_id: request.user?.id })
        .orderBy('date', 'desc')

      const { bestOnDietSequence } = totalMeals.reduce(
        (acc, meal) => {
          if (meal.is_on_diet) {
            acc.currentSequence += 1
          } else {
            acc.currentSequence = 0
          }

          if (acc.currentSequence > acc.bestOnDietSequence) {
            acc.bestOnDietSequence = acc.currentSequence
          }

          return acc
        },
        { bestOnDietSequence: 0, currentSequence: 0 },
      )

      return reply.send({
        totalMeals: totalMeals.length,
        totalMealsOnDiet: totalMealsOnDiet?.total,
        totalMealsOffDiet: totalMealsOffDiet?.total,
        bestOnDietSequence,
      })
    },
  )
}
