import { gql, ApolloClient, InMemoryCache } from '@apollo/client';

class GraphQLService {
  private client: ApolloClient<any>;

  constructor(uri: string) {
    this.client = new ApolloClient({
      uri,
      cache: new InMemoryCache(),
    });
  }

  async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await this.client.query<T>({
      query: gql(query),
      variables,
    });
    return response.data;
  }

  async mutate<T>(mutation: string, variables?: Record<string, any>): Promise<T> {
    const response = await this.client.mutate<T>({
      mutation: gql(mutation),
      variables,
    });
    return response.data;
  }
}

export default GraphQLService;