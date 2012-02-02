import simplex
import json
import webapp2


class VOXEL:
	AIR=		0 
	DIRT=		1 
	HALFBLOCK=	2 
	WOOD=		3
	PIT=		4


def world(sn,x,y,z):
	if sn.simplexNoise((x*0.015,y*0.015,z*0.025))>0.75:
		return VOXEL.DIRT
	else:
		return VOXEL.AIR


class MainPage(webapp2.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/html'
		self.response.out.write('Hello')
class WorldLoader(webapp2.RequestHandler):
	def get(self,key="default"):
		if key == "":
			key = "WebLaputa"
		sn = simplex.SimplexNoise(key,3)

		size = [128,128,31]
		size = [64,64,31]
		data = [0]*size[0]
		for x in range(size[0]):
			data[x] = [0]*size[1]
			for y in range(size[1]):
				data[x][y] = [0]*size[2]
				for z in range(size[2]):
					data[x][y][z] = world(sn,x,y,z)


		self.response.out.write(json.dumps(data))
app = webapp2.WSGIApplication([
	('/',MainPage),
	('/world/(.*)',WorldLoader),
	], debug=True)
