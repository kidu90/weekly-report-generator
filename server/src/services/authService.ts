import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { MongoServerError } from "mongodb";
import User from "../models/User";
import type { AuthUser } from "../middleware/auth";
import { ServiceError } from "../utils/errors";
import { signAccessToken } from "../utils/jwt";
import type {
  AuthLoginInput,
  AuthRegisterInput,
} from "../validation/authSchema";

const SALT_ROUNDS = 12;

export interface AuthResponseUser extends AuthUser {
  name: string;
}

function serializeUser(user: {
  _id: string;
  email: string;
  name: string;
  role: AuthUser["role"];
}): AuthResponseUser {
  return {
    userId: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

function isDuplicateEmailError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export async function register(
  input: AuthRegisterInput,
): Promise<AuthResponseUser> {
  try {
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await User.create({
      _id: randomUUID(),
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash,
    });

    return serializeUser(user.toObject());
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      throw new ServiceError(409, "A user with that email already exists");
    }

    throw error;
  }
}

export async function login(
  input: AuthLoginInput,
): Promise<{ token: string; user: AuthResponseUser }> {
  const user = await User.findOne({ email: input.email }).select(
    "+passwordHash",
  );

  if (!user) {
    throw new ServiceError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new ServiceError(401, "Invalid email or password");
  }

  const userData = serializeUser(user.toObject());

  return {
    token: signAccessToken(userData),
    user: userData,
  };
}
