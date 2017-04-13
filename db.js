const express = require('express');
const request = require('request-promise');
const mysql = require('promise-mysql')

class DBWrapper {
  constructor () {
        this.connection = mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_DATABASE
        }).catch(error => {
          console.error('Error connecting to DB: ', error)
        })
    }
  
  checkIfUserExists(fbid) {
      const query = 'SELECT * FROM users WHERE fbid=' + fbid
      console.log('---------CHECKING IF USER EXISTS----------')
      return this.connection.then(conn => {
        return conn.query(query)
      }).then(rows => {
          if (rows.length) {
            return Promise.resolve(true)
          } else {
            return Promise.resolve(false)
          }
      }).catch(error => {
        console.error('Error in checking if user exists: ', error)
      })
  }
  
  createUser(fbid) {
    const endpoint = 'https://graph.facebook.com/v2.6/' + fbid + '?access_token=' + process.env.PAGE_ACCESS_TOKEN
    const query = 'INSERT INTO users (fbid, firstName, lastName, profile_pic, gender, locale) values (?, ?, ?, ?, ?, ?)'
    let values = []
    return request.get(endpoint).then(body => {
      const user = JSON.parse(body)
      values = [fbid, user['first_name'], user['last_name'], user['profile_pic'], user['locale'], user['gender']]
      return this.connection
    }).then(conn => {
      return conn.query(query, values)
    }).then(rows => {
      return Promise.resolve(true)
    }).catch(error => {
      console.error('Error in creating user:', error)
    })
  }
  
  getIdFromFbid(fbid) {
    const query = 'SELECT * FROM users WHERE fbid=?'
    const values = [fbid]
    return this.connection.then(conn => {
      return conn.query(query, values)
    }).then(rows => {
      return Promise.resolve(rows[0].id)
    })
  }
  
  addEvent(ev) {
    const event = {
      fbId: ev.sender.id,
      message: ev.message.text,
      timestamp: ev.timestamp
    }
    const query = 'INSERT INTO events (userid, fbid, message, fbTimestamp) values (?, ?, ?, ?)'
    let values = []
    return this.getIdFromFbid(event.fbId).then(id => {
      event['userId'] = id
      return this.connection
    }).then(conn => {
      values = [event['userId'], event['fbId'], event['message'], event['timestamp']]
      return conn.query(query, values)
    }).then(res => {
      return Promise.resolve(true)
    }).catch(err => {
      console.error(err)
    })
  }
  
  getAllFbids() {
    const query = 'SELECT fbid from users'
    return this.connection.then(conn => {
      return conn.query(query)
    }).then(rows => {
      const fbids = rows.map(row => {
        return row.fbid
      })
      return Promise.resolve(fbids)
    }).catch(err => {
      console.error('Error trying to get all fbids:', err)
    })
  }

}

module.exports = DBWrapper;