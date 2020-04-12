const { ApolloServer } = require("apollo-server");
const gql = require("graphql-tag");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const typeDefs = gql`
    type Query {
      jwt(id: Int!, username: String, password: String): String
    }
`;

async function postRequest(id) {
  const https = require("https");

  const data = `
  query MyQuery {
    users_by_pk(id: ${id}) {
      id
      username
      password
    }
  }
  `;

  const options = {
    hostname: "hasura-shooter.herokuapp.com",
    method: "POST",
    port: 8080,
    path: "/v1/graphql",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
      "x-hasura-admin-secret": process.env.SECRET
    }
  };

  const req = https.request(options, res => {
    console.log('Abeg na!')
    console.log(`statusCode: ${res.statusCode}`);
    res.on("data", d => {
      console.log('epp')
      process.stdout.write(d);
    });
  });
  
  req.on("error", error => {
    console.error(error);
  });

  req.write(data);
  req.end();
}

const resolvers = {
  Query: {
    jwt: async(parent, args, context) => {
      // read the authorization header sent from the client
      const authHeaders = context.headers.authorization;
      const token = authHeaders.replace("Bearer ", "");
      // decode the token to confirm greatness
      if (token !== "ShooterGreatness") {
        return null;
      }
      var user = await postRequest(args.id);
      console.log(user)
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
