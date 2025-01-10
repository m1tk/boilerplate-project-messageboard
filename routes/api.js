'use strict';
const { body, validationResult } = require('express-validator');
const thread_model = require('../db/thread_model');

module.exports = function (app) {
  
  app.route('/api/threads/:board')
  .post([
    body('text').isString().trim().escape(),
    body('delete_password').isString(), // Will never be returned to user so no danger of Xss
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const board = req.params.board;
    const { text, delete_password } = req.body;
    try {
      await thread_model.addThread(
        board,
        text,
        delete_password
      );
    } catch (err) {
      console.error(err);
      return res.status(500).json('Failed adding thread');
    }
    res.redirect(`/b/${board}/`);
  });

};
