/*
 * Base WebLaputa code that doesn't really belong anywhere else.
 *
 * Copyright (c) 2012 Mark Browning
 *
 * Licensed under GPL3 or later.
 *
 */


var gl;
function initGL(canvas) {
	try {
		gl = canvas.getContext("experimental-webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch (e) {
	}
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}
}

DIR = {
	N:	0,
	E:	2,
	S:	4,
	W:	6
}
VOXEL = {
	AIR:		0, 
	DIRT:		1, 
	HALFBLOCK:	2, 
	WOOD:		3,
	PIT:		4,
}
var last = 5;
BLOCKS = {BLOCK:0,ARCH:0,RAMP:0}
for(blk in BLOCKS)
{
	for(dir in DIR)
	{
		VOXEL[blk+dir+"A"] = last++;
		VOXEL[blk+dir+"B"] = last++;
	}
}


var renderer;
var world;

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
		  window.webkitRequestAnimationFrame || 
		  window.mozRequestAnimationFrame    || 
		  window.oRequestAnimationFrame      || 
		  window.msRequestAnimationFrame     || 
		  function( callback ){
			window.setTimeout(callback, 1000 / 60);
		  };
})();

function start() 
{
	var canvas = document.getElementById("webGL");
	initGL(canvas);
	world = new WLWorld(128);
	renderer = new WLRenderer(world);
	(function animloop(){
		  requestAnimFrame(animloop);
		  renderer.draw();
		})();
}


