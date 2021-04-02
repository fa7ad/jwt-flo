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
      signUp(email: String!, password: String!, name: String!): String
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
    insert_user_one(object: {email: "${email}", password: "${password}", profile: {data: {name: "${name}"}}}) {
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

function signupRequestWrapper(email, password, name) {
  return new Promise((resolve, reject) => {
    signupRequest(email, password, name, successResponse => {
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
        !user.data.user.length ||
        !(await bcrypt.compare(args.password, user.data.user[0].password))
      ) {
        console.log("No match");
        return null;
      }
      const userData = user.data.user[0];
      console.log({userData})
      const privateKey = process.env.PRIVATE_KEY;
      var result = jwt.sign(
        {
          id: userData.id,
          email: args.email,
          "https://hasura.io/jwt/claims": {
            "x-hasura-allowed-roles": ["user"],
            "x-hasura-default-role": "user",
            "x-hasura-user-id": "" + userData.id
          }
        },
        privateKey,
        { algorithm: "HS256" }
      );
      return result;
    }
  },
  Mutation: {
    signUp: async (parent, args, context) => {
      // read the authorization header sent from the client
      const authHeaders = context.headers.authorization;
      const token = authHeaders.replace("Bearer ", "");
      // decode the token to confirm greatness
      if (token !== process.env.CLIENT_TOKEN) {
        return null;
      }
      const password = await bcrypt.hash(args.password, 10);
      const userStr = await signupRequestWrapper(
        args.email,
        password,
        args.name
      );
      const data = JSON.parse(userStr);
      console.log(data.errors);
      const userData = data.data.insert_user_one;
      const privateKey = process.env.PRIVATE_KEY;
      var result = jwt.sign(
        {
          id: userData.id,
          email: userData.email,
          "https://hasura.io/jwt/claims": {
            "x-hasura-allowed-roles": ["user"],
            "x-hasura-default-role": "user",
            "x-hasura-user-id": "" + userData.id
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
