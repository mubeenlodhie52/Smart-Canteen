// import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

// const { Pool } = pkg;

// export const db = new Pool({
//   host: process.env.PG_HOST,
//   port: process.env.PG_PORT,
//   user: process.env.PG_USER,
//   password: process.env.PG_PASS,
//   database: process.env.PG_DB,
// });


import { neon } from "@neondatabase/serverless";

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const sql = neon(
  `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require&channel_binding=require`
);

export { sql };
