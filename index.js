const { ApolloServer } = require("apollo-server");
const gql = require("graphql-tag");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const https = require("https");
const bcrypt = require("bcrypt");

const typeDefs = gql`
    type Query {
      jwt(email: String!, password: String): String
    }
    type Mutation {
      signUp(email: String!, password: String!, name: String!): User
    }
`;

function postRequest(email, success) {
  let data = `
  query MyQuery {
    user(where: {email: {_eq: "${email}"}}) {
      id
      email
      password
    }
  }
  `;
  data = JSON.stringify({ query: data });
  const options = {
    hostname: "flo-life.hasura.app",
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
      success("" + responseData);
    });
    res.on("end", function() {
      return responseData;
    });
  });

  req.on("error", error => {
    console.error(error);
  });

  req.write(data);
  req.end();
}

function postRequestWrapper(email) {
  return new Promise((resolve, reject) => {
    postRequest(email, successResponse => {
      resolve(successResponse);
    });
  });
}


function signupRequest(email, password, name, success) {
  let data = `
  mutation MyMutation {
    insert_user_one(object: {email: "${email}", password: "${password}", profile: {data: {name: "${name}", settings: ""}}}, on_conflict: {}) {
      id
      email
      profile {
        id
        name
        organization
        position
        settings
      }
    }
  }

  `;
  data = JSON.stringify({ query: data });
  const options = {
    hostname: "flo-life.hasura.app",
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
      success("" + responseData);
    });
    res.on("end", function() {
      return responseData;
    });
  });

  req.on("error", error => {
    console.error(error);
  });

  req.write(data);
  req.end();
}

function postRequestWrapper(email) {
  return new Promise((resolve, reject) => {
    postRequest(email, successResponse => {
      resolve(successResponse);
    });
  });
}

const resolvers = {
  Query: {
    jwt: async (parent, args, context) => {
      // read the authorization header sent from the client
      const authHeaders = context.headers.authorization;
      const token = authHeaders.replace("Bearer ", "");
      // decode the token to confirm greatness
      if (token !== process.env.CLIENT_TOKEN) {
        return null;
      }
      var userString = await postRequestWrapper(args.email);
      var user = JSON.parse(userString);
      if (
        !user ||
        !(await bcrypt.compare(args.password, user.data.user.password))
      ) {
        console.log("No match");
        return null;
      }
      const privateKey = process.env.PRIVATE_KEY;
      var result = jwt.sign(
        {
          id: user.data.user.id,
          email: args.email,
          "https://hasura.io/jwt/claims": {
            "x-hasura-allowed-roles": ["user"],
            "x-hasura-default-role": "user",
            "x-hasura-user-id": "" + user.data.user.id
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
