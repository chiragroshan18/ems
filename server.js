const express = require('express');
const path = require('path');

const eventRoutes = require('./routes/eventRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const teamRoutes = require('./routes/teamRoutes');
const taskRoutes = require('./routes/taskRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const guestRoutes = require('./routes/guestRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const searchRoutes = require('./routes/searchRoutes');
const dataRoutes = require('./routes/dataRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Malformed JSON handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body'
    });
  }
  next(err);
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// Nested event sub-routes
app.use('/api/events/:eventId/schedule', scheduleRoutes);
app.use('/api/events/:eventId/team', teamRoutes);
app.use('/api/events/:eventId/tasks', taskRoutes);
app.use('/api/events/:eventId/budget', budgetRoutes);
app.use('/api/events/:eventId/guests', guestRoutes);
app.use('/api/events/:eventId/announcements', announcementRoutes);

// Direct top-level REST routes
app.use('/api/events', eventRoutes);
app.use('/api/events', analyticsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/data', dataRoutes);

// 404 handler for undefined API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' does not exist`
  });
});

// Fallback for HTML5 client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` EMS (Event Management System) Server Active `);
    console.log(` Local URL: http://localhost:${PORT} `);
    console.log(` Cloud-Ready REST API Architecture `);
    console.log(`==================================================`);
  });
}

module.exports = app;
