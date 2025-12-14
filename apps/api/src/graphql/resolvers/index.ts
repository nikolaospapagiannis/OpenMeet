/**
 * GraphQL Resolvers Index - Combines all resolvers
 * Real implementations with Prisma and Redis
 */

import { GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import { meetingQueries, meetingMutations, meetingFieldResolvers } from './meetingResolvers';
import {
  subscriptionResolvers,
  commentMutations,
  commentFieldResolvers,
} from './subscriptionResolvers';

// ============================================================================
// COMBINED RESOLVERS
// ============================================================================

export const resolvers = {
  // Custom scalars
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,

  // Queries
  Query: {
    ...meetingQueries,
  },

  // Mutations
  Mutation: {
    ...meetingMutations,
    ...commentMutations,
  },

  // Subscriptions
  Subscription: {
    ...subscriptionResolvers,
  },

  // Field resolvers
  ...meetingFieldResolvers,
  ...commentFieldResolvers,
};

export default resolvers;
