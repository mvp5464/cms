/**
 * POST - Link userId and github username to be verified later
 * PUT - Verify the userId and github from db
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const PostInputZod = z.object({
  value: z.string(),
  userId: z.string(),
});

const PutInputZod = z.object({
  username: z.string(),
  email: z.string().optional(),
  publicName: z.string().optional(),
  image: z.string().optional(),
});

type PostInputType = z.infer<typeof PostInputZod>;
type PutInputType = z.infer<typeof PutInputZod>;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session?.user) {
    return NextResponse.json(
      { message: 'Authentication failed' },
      { status: 401 },
    );
  }

  const { value: username, userId }: PostInputType = await req.json();
  try {
    await db.githubUser.upsert({
      where: { userId, isLinked: false },
      create: { userId, username },
      update: { userId, username },
    });
    return NextResponse.json({ message: 'successful' }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ message: 'failed' }, { status: 403 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session?.user) {
    return NextResponse.json(
      { message: 'Authentication failed' },
      { status: 401 },
    );
  }

  const { username, email, publicName, image }: PutInputType = await req.json();
  if (!username) {
    return NextResponse.json(
      { message: 'error while fetching username' },
      { status: 403 },
    );
  }
  try {
    const findUser = await db.githubUser.findUnique({
      where: { username, isLinked: false },
    });
    if (!findUser) {
      return NextResponse.json(
        { message: 'Error while linking account, username is different' },
        { status: 401 },
      );
    }
    const updateInfo = await db.githubUser.update({
      where: { username },
      data: { isLinked: true, email, publicName, image },
    });

    await db.bountyInfo.updateMany({
      where: { username },
      data: { githubUserId: updateInfo.userId },
    });

    return NextResponse.json({ message: 'successful' }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { message: 'Error while linking account, username is different' },
      { status: 403 },
    );
  }
}