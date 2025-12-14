/**
 * Enhanced GraphQL Resolvers with Subscriptions
 * Combines existing resolvers with new subscription support
 */

import baseResolvers from './resolvers';
import { revenueResolvers } from './revenueResolvers';
import { subscriptionResolvers, commentMutations } from './resolvers/subscriptionResolvers';
import { meetingQueries, meetingMutations, meetingFieldResolvers } from './resolvers/meetingResolvers';

// Merge all resolvers
export const enhancedResolvers = {
  ...baseResolvers,
  Query: {
    ...baseResolvers.Query,
    ...meetingQueries, // Enhanced meeting queries with DataLoaders
  },
  Mutation: {
    ...baseResolvers.Mutation,
    ...meetingMutations, // Enhanced meeting mutations with PubSub
    ...commentMutations, // Comment mutations with real-time updates
  },
  Subscription: {
    ...subscriptionResolvers, // Real Redis-backed subscriptions
  },
  // Field resolvers
  ...meetingFieldResolvers,
};

export default enhancedResolvers;
