const { ApolloServer } = require("apollo-server");
const gql = require("graphql-tag");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const typeDefs = gql`
    type Query {
      jwt(id: Int!, username: String, password: String): String
    }
`;

function postRequest(id) {
  const https = require("https");

  const data = `query MyQuery {users_by_pk(id: ${id}) {idusernamepassword}}`;

  const options = {
    hostname: "https://hasura-shooter.herokuapp.com/v1/graphql",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
      "x-hasura-admin-secret": process.env.SECRET
    }
  };

  const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);

    res.on("data", d => {
      process.stdout.write(d);
      return d;
    });
  });

  req.on("error", error => {
    console.error(error);
  });

  req.write(data);
  req.end();
  return data;
}

const resolvers = {
  Query: {
    jwt: (parent, args, context) => {
      // read the authorization header sent from the client
      const authHeaders = context.headers.authorization;
      const token = authHeaders.replace("Bearer ", "");
      // decode the token to confirm greatness
      if (token !== "ShooterGreatness") {
        return null;
      }
      var user = postRequest(args.id);
      if (user.data.password !== args.password){
        return null;
      }
      const privateKey = "ShooterNationShooterNationShooterNation";
      var result = jwt.sign(
        {
          id: args.id,
          username: args.username,
          "https://hasura.io/jwt/claims": {
            "x-hasura-allowed-roles": ["user"],
            "x-hasura-default-role": "user",
            "x-hasura-user-id": "" + args.id
          }
        },
        privateKey,
        { algorithm: "HS256" }
      );
      return result;
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
