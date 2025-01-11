'use strict';
const { body, validationResult, query } = require('express-validator');
const mongoose = require('mongoose');
const { ObjectId } = require("mongodb");

mongoose.connect(
  process.env.DB_URI,
  {
    serverApi: {
      version: '1',
      strict: true,
      deprecationErrors: true
    },
    connectTimeoutMS: 60000,
    socketTimeoutMS: 60000,
    timeoutMS: 50000
  });

const schema = new mongoose.Schema({
  board: { type: String, required: true, unique: true },
  thread: [
    {
      _id: { type: ObjectId, default: new ObjectId() },
      text: { type: String, required: true },
      created_on: { type: Date, default: Date.now },
      bumped_on: { type: Date, default: Date.now },
      reported: { type: Boolean, default: false },
      delete_password: String,
      reply: [
        {
          _id: { type: ObjectId, default: new ObjectId() },
          text: { type: String, required: true },
          created_on: { type: Date, default: Date.now },
          delete_password: String,
          reported: { type: Boolean, default: false },
        },
      ]
    }
  ],
});

const modelStore = mongoose.model("modelStore", schema);

module.exports = function (app) {
  
  app.route('/api/threads/:board')
  .post([
    body('text').isString().trim().escape(),
    body('delete_password').isString(), // Will never be returned to user so no danger of Xss
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(errors);
    }
    const board = req.params.board;
    const { text, delete_password } = req.body;
    
    await modelStore.findOneAndUpdate(
      { board: board },
      {
        $push: {
          thread: {
            text,
            delete_password,
          }
        }
      },
      { new: true }
    );

    res.redirect(`/b/${board}/`);
  })
  .get(async (req, res) => {
    const board = req.params.board;

    const threads = await modelStore.aggregate([
      { $match: { board: board } },
      { $unwind: "$thread" },
      { $sort: { "thread.bumped_on": -1 } },
      { $replaceRoot: { newRoot: "$thread" } }
    ])
    .limit(10);
    
    threads.forEach((thread) => {
      delete thread.delete_password;
      delete thread.reported;
      thread.replycount = thread.reply.length;

      thread.reply = thread.reply
        .sort((e, v) => v.created_on - e.created_on)
        .slice(-3)
        .map((reply) => {
          delete reply.delete_password;
          delete reply.reported;
          return reply;
        });

      thread.replies = thread.reply;
      delete thread.reply;
    });

    return res.json(threads);
  })
  .delete([
    body('thread_id').isString().trim().escape().isLength(24),
    body('delete_password').isString()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(errors);
    }
    const board = req.params.board;
    const { thread_id, delete_password } = req.body;
    
    const thread = await modelStore.updateOne(
      { board: board},
      { $pull: { thread: { _id: new ObjectId(thread_id), delete_password: delete_password } } }
    );
    if (thread.modifiedCount > 0) {
      res.send("Thread deleted");
    } else {
      res.send("Invalid delete password");
    }
  })
  .put([
      body('thread_id').isString().trim().escape().isLength(24)
    ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(errors);
    }
    const board = req.params.board;
    const { thread_id } = req.body;
    
    const thread = await modelStore.updateOne(
      { board: board, 'thread._id': new ObjectId(thread_id) },
      { $set: { 'thread.$.reported': true } }
    );
    if (thread.modifiedCount > 0) {
      res.send("Thread was reported");
    } else {
      res.status(404).send("Thread not found");
    }
  });
    
  app.route('/api/replies/:board')
  .post([
    body('thread_id').isString().trim().escape().isLength(24),
    body('text').isString().trim().escape(),
    body('delete_password').isString(), // Will never be returned to user so no danger of Xss
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(errors);
    }
    const board = req.params.board;
    const { thread_id, text, delete_password } = req.body;
    
    const thread = await modelStore.findOneAndUpdate(
      { board: board, 'thread._id': new ObjectId(thread_id) },
      {
        $push: {
          'thread.$.reply': {
            text: text,
            delete_password: delete_password,
          }
        },
        $set: { bumped_on: new Date() }
      }
    );
    if (!thread || thread.modifiedCount <= 0) {
      res.status(404).send("Thread not found");
    } else {
      res.redirect(`/b/${board}/${thread_id}`);
    }
  })
  .get([
      query('thread_id').isString().trim().escape().isLength(24),
    ],
    async (req, res) => {
    const board = req.params.board;
    const { thread_id } = req.query;

    const threads = await modelStore.aggregate([
      { $match: { board: board } },
      { $unwind: "$thread" },
      { $match: { "thread._id": new ObjectId(thread_id) } },
      { $replaceRoot: { newRoot: "$thread" } }
    ]);
    
    threads.forEach((thread) => {
      delete thread.delete_password;
      delete thread.reported;
      thread.replycount = thread.reply.length;

      thread.reply = thread.reply
        .sort((e, v) => v.created_on - e.created_on)
        .map((reply) => {
          delete reply.delete_password;
          delete reply.reported;
          return reply;
        });

      thread.replies = thread.reply;
      delete thread.reply;
    });

    return res.json(threads[0]);
  })
  .delete([
    body('thread_id').isString().trim().escape().isLength(24),
    body('reply_id').isString().trim().escape().isLength(24),
    body('delete_password').isString()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(errors);
    }
    const board = req.params.board;
    const { thread_id, reply_id, delete_password } = req.body;
    
    const thread = await modelStore.updateOne(
      { board: board },
      { $set: { 'thread.$[i].reply.$[r].text': "[deleted]" } },
      {
        arrayFilters: [
          { 'i._id': new ObjectId(thread_id) },
          {
            'r._id': new ObjectId(reply_id),
            'r.delete_password': delete_password
          }
        ]
      }
    );
    if (thread.modifiedCount > 0) {
      res.send("Reply deleted");
    } else {
      res.send("Invalid delete password");
    }
  })
  .put([
    body('thread_id').isString().trim().escape().isLength(24),
    body('reply_id').isString().trim().escape().isLength(24)
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(errors);
    }
    const board = req.params.board;
    const { thread_id, reply_id } = req.body;
    
    const thread = await modelStore.updateOne(
      { board: board },
      { $set: { 'thread.$[i].reply.$[r].reported': true } },
      {
        arrayFilters: [
          { 'i._id': new ObjectId(thread_id) },
          {
            'r._id': new ObjectId(reply_id)
          }
        ]
      }
    );
    if (thread.modifiedCount > 0) {
      res.send("Reply reported");
    } else {
      res.status(404).send("Reply not found");
    }
  });

};
