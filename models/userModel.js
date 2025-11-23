// src/models/userModel.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

async function findOrCreateUser(phone_number) {
  let user = await db('users').where({ phone_number }).first();
  if (!user) {
    const userId = uuidv4();
    await db('users').insert({
      id: userId,
      phone_number,
      is_verified: 1
    });
    user = await db('users').where({ id: userId }).first();
  }
  return user;
}

async function getUserById(userId) {
  return await db('users').where({ id: userId }).first();
}

async function getUserByPhone(phone_number) {
  return await db('users').where({ phone_number }).first();
}

/**
 * Update user name
 * @param {string} userId - User ID
 * @param {string} name - User name
 * @returns {Object} - Updated user object
 */
async function updateUserName(userId, name) {
  await db('users')
    .where({ id: userId })
    .update({ name: name || null });
  
  return await db('users').where({ id: userId }).first();
}

module.exports = { findOrCreateUser, getUserById, getUserByPhone, updateUserName };
