const express = require('express');
const request = require('request');

class DBWrapper {
  constructor () {
        this.mysql = require('mysql');
        this.connection = this.mysql.createConnection({
        host     : process.env.DB_HOST,
        user     : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        database : process.env.DB_DATABASE
      })
    }
  
  checkIfUserExists(fbid) {
    //this.connection.connect()
    //const query = 'SELECT * FROM users WHERE fbid=fbid'
    //this.connection.query(query, function (err, rows, fields) {
    //  if (err) throw err
      
    //})

    //this.connection.end()
    return false
  }
  
  createUser(fbid) {
    const user = this.getFbUser(fbid)
    console.log(user)
    this.connection.connect()
    const query = 'INSERT * FROM users WHERE fbid=fbid'
    this.connection.query(query, function (err, rows, fields) {
      if (err) throw err

      console.log('The solution is: ', rows[0].solution)
    })

    this.connection.end()
    return true
  }
  
  getFbUser(id) {
    const endpoint = 'https://graph.facebook.com/v2.6/' + id + '?access_token=' + process.env.PAGE_ACCESS_TOKEN
    let user = 'dog'
    request.get(endpoint, function(e, r, body) {
      if (e) {
        throw e;
      }
      user = JSON.parse(body);
    })
    return user
  }

}

module.exports = DBWrapper;