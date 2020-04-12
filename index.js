const { ApolloServer } = require("apollo-server");
const gql = require("graphql-tag");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const https = require("https");

const typeDefs = gql`
    type Query {
      jwt(id: Int!, username: String, password: String): String
    }
`;

function postRequest(id) {
  let data = `
  query MyQuery {
    users_by_pk(id: ${id}) {
      id
      username
      password
    }
  }
  `;
  data = JSON.stringify({query: data});
  const options = {
    hostname: "hasura-shooter.herokuapp.com",
    method: "POST",
    path: "/v1/graphql",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
      "x-hasura-admin-secret": process.env.SECRET
    }
  };

  const req = https.request(options, res => {
    let responseData;
    console.log(`statusCode: ${res.statusCode}`);
    res.on("data", d => {
      responseData = d;
      console.log(responseData + ' is the data');
      return new Promise(resolve => {
        resolve(responseData);
  });
    });
    res.on('end', function() {       
      return responseData;
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
