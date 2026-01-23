import { z } from 'zod';
import { insertQuizResultSchema, insertPollVoteSchema, quizzes, polls, articles, quizResults } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  quizzes: {
    list: {
      method: 'GET' as const,
      path: '/api/quizzes',
      responses: {
        200: z.array(z.custom<typeof quizzes.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/quizzes/:id',
      responses: {
        200: z.custom<any>(), // QuizWithQuestions
        404: errorSchemas.notFound,
      },
    },
    submit: {
      method: 'POST' as const,
      path: '/api/quizzes/:id/submit',
      input: z.object({
        answers: z.record(z.string(), z.number()), // questionId -> optionId
      }),
      responses: {
        200: z.custom<typeof quizResults.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  polls: {
    list: {
      method: 'GET' as const,
      path: '/api/polls',
      responses: {
        200: z.array(z.custom<any>()), // PollWithDetails
      },
    },
    vote: {
      method: 'POST' as const,
      path: '/api/polls/:id/vote',
      input: z.object({
        optionId: z.number(),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
        400: z.object({ message: z.string() }),
      },
    },
  },
  articles: {
    list: {
      method: 'GET' as const,
      path: '/api/articles',
      responses: {
        200: z.array(z.custom<typeof articles.$inferSelect>()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
