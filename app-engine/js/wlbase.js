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
		gl.canvas = canvas;
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
	canvas.width  = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	initGL(canvas);
	world = new WLWorld(128);
	renderer = new WLRenderer(world);
	(function animloop(){
		  requestAnimFrame(animloop);
		  renderer.draw();
		})();
	var loading = document.getElementById("loading");
	loading.parentNode.removeChild(loading);
}

function cubeIntersect(cube,origin,ray)
{
	//Finds which x plane (0 or 1), which y plane, which z plane
	//Finds the distance to intersect with that plane
	//Picks the lowest distance
	//Finds the actual intersection point
	var x,y,z,xnc,ync,znc;
	if(ray[0]>0)
	{
		x = (cube[0]+1-origin[0])/ray[0];
		xnc = vec3.add([1,0,0],cube);
	}
	else
	{
		x = (cube[0]-origin[0])/ray[0];
		xnc = vec3.add([-1,0,0],cube);
	}

	if(ray[1]>0)
	{
		y = (cube[1]+1-origin[1])/ray[1];
		ync = vec3.add([0,1,0],cube);
	}
	else
	{
		y = (cube[1]-origin[1])/ray[1];
		ync = vec3.add([0,-1,0],cube);
	}

	if(ray[2]>0)
	{
		z = (cube[2]+1-origin[2])/ray[2];
		znc = vec3.add([0,0,1],cube);
	}
	else
	{
		z = (cube[2]-origin[2])/ray[2];
		znc = vec3.add([0,0,-1],cube);
	}
	var t,nc;
	if(x < y && x < z)
	{
		t = x;
		nc = xnc;
	}
	else if(y < x && y < z)
	{
		t = y;
		nc = ync;
	}
	else
	{
		t = z;
		nc = znc;
	}

	// I = O + tR
	var inter = vec3.add(vec3.scale(ray,t,vec3.create()),origin);
	return [nc,inter];
}

