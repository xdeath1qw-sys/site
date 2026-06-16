// Netlify Function для синхронизации данных
// Хранит данные в памяти (простое решение)

let database = {
  pl_users: [],
  pl_teams: [],
  pl_players: [],
  pl_matches: [],
  pl_news: [],
  pl_invites: [],
  pl_tournaments: [],
  pl_tourn_regs: {},
  pl_vetos: [],
  pl_highlights: [],
  pl_awards: [],
  pl_notifications: []
};

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // GET - получить все данные
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(database)
      };
    }

    // PUT - обновить все данные
    if (event.httpMethod === 'PUT') {
      const newData = JSON.parse(event.body);
      database = { ...database, ...newData };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Data updated' })
      };
    }

    // POST - обновить один ключ
    if (event.httpMethod === 'POST') {
      const { key, value } = JSON.parse(event.body);
      
      if (!key) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Key is required' })
        };
      }
      
      database[key] = value;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Key ${key} updated` })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
