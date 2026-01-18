<?php
/**
 * Roots Maghreb - Node.js Backend Redirect
 * 
 * This file exists because Apache is trying to find a PHP file.
 * However, this is a Node.js application running via Passenger.
 * 
 * The actual application is served by server.js (Node.js).
 */

// Redirect to Node.js health check
header('Location: /health');
exit;
?>
