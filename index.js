const { ApolloServer } = require("apollo-server");
const gql = require("graphql-tag");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const typeDefs = gql`
  type auth0_profile {
      email: String
      picture: String
    }

    type Query {
      auth0: auth0_profile
    }
`;

function getProfileInfo(user_id) {
  const headers = {
    Authorization: "Bearer " + process.env.AUTH0_MANAGEMENT_API_TOKEN
  };
  console.log(headers);
  return fetch(
    "https://" + process.env.AUTH0_DOMAIN + "/api/v2/users/" + user_id,
    { headers: headers }
  ).then(response => response.json());
}

const resolvers = {
  Query: {
    auth0: (parent, args, context) => {
      // read the authorization header sent from the client
      const authHeaders = context.headers.authorization;
      const token = authHeaders.replace("Bearer ", "");
      // decode the token to find the user_id
      try {
        const decoded = jwt.decode(token);
        const user_id = decoded.sub;
        // make a rest api call to auth0
        return getProfileInfo(user_id).then(function(resp) {
          console.log(resp);
          if (!resp) {
            return null;
          }
          return { email: resp.email, picture: resp.picture };
        });
      } catch (e) {
        console.log(e);
        return null;
      }
    },
    jwt: (parent, args, context) => {
      // read the authorization header sent from the client
      const authHeaders = context.headers.authorization;
      const token = authHeaders.replace("Bearer ", "");
      // decode the token to confirm greatness
      if (token !== "ShooterGreatness") {
        return null;
      }
      const privateKey = "ShooterNationShooterNationShooterNation";
      jwt.sign(
        {
          id: args.id,
          username: args.username,
          admin: true,
          iat: 1516239022,
          "https://hasura.io/jwt/claims": {
            "x-hasura-allowed-roles": ["user"],
            "x-hasura-default-role": "user",
            "x-hasura-user-id": "1234567890",
            "x-hasura-org-id": "123",
            "x-hasura-custom": "custom-value"
          }
        },
        privateKey,
        { algorithm: "HS256" }
      );
      try {
        const decoded = jwt.decode(token);
        const user_id = decoded.sub;
        // make a rest api call to auth0
        return getProfileInfo(user_id).then(function(resp) {
          console.log(resp);
          if (!resp) {
            return null;
          }
          return { email: resp.email, picture: resp.picture };
        });
      } catch (e) {
        console.log(e);
        return null;
      }
    }
  }
};

const context = ({ req }) => {
  return { headers: req.headers };
};

const schema = new ApolloServer({ typeDefs, resolvers, context });

schema.listen({ port: process.env.PORT }).then(({ url }) => {
  console.log(`schema ready at ${url}`);
});
