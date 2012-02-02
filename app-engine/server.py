import simplex
import json
import webapp2
import struct

from google.appengine.ext import db
#from google.appengine.ext import deferred
#from google.appengine.api import memcache

class VOXEL:
	AIR=		0 
	DIRT=		1 
	HALFBLOCK=	2 
	WOOD=		3
	PIT=		4

chunksize = 32

def do_world(sn,x,y,z):
	if sn.simplexNoise((x*0.015,y*0.015,z*0.025))>0.75:
		return VOXEL.DIRT
	else:
		return VOXEL.AIR

simplexNoises = {}
def get_simplex(seed):
	if not seed in simplexNoises:
		simplexNoises[seed] = simplex.SimplexNoise(seed,3)
	return simplexNoises[seed]


class World(db.Model):
	xmin = db.IntegerProperty() #in chunks
	ymin = db.IntegerProperty() #in chunks
	zmin = db.IntegerProperty() #in chunks
	xmax = db.IntegerProperty() #in chunks
	ymax = db.IntegerProperty() #in chunks
	zmax = db.IntegerProperty() #in chunks


chunk_struct = struct.Struct('B'*chunksize)

class Client(db.Model):
	world     = db.ReferenceProperty(World)
	user      = db.UserProperty()

class Chunk(db.Model):
	world = db.ReferenceProperty(World)
	x     = db.IntegerProperty() #index of chunk
	y     = db.IntegerProperty() #index of chunk
	z     = db.IntegerProperty() #index of chunk
	pdata = db.BlobProperty()
	def generate(self):
		seed = self.world.key().name()
		sn = get_simplex(seed)
		data = [0]*chunksize
		for x in range(chunksize):
			data[x] = [0]*chunksize
			xc = self.x * chunksize + x
			for y in range(chunksize):
				data[x][y] = [0]*chunksize
				yc = self.y * chunksize + y
				for z in range(chunksize):
					if do_world(sn, xc, yc, self.z*chunksize + z):
						data[x][y][z] = VOXEL.DIRT
		self.data = data
	def pack(self):
		if hasattr(self,'data'):
			str = r''
			for x in self.data:
				for y in x:
					str +=chunk_struct.pack(*y)
			self.pdata = str
	def unpack(self):
		offset = 0
		data = [0]*chunksize
		for x in range(chunksize):
			data[x] = [0]*chunksize
			for y in range(chunksize):
				data[x][y] = chunk_struct.unpack_from(self.pdata,offset)
				offset += chunksize
		self.data = data

class MainPage(webapp2.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/html'
		self.response.out.write('Hello')
class JoinHandler(webapp2.RequestHandler):
	def get(self,seed=""):
		if seed == "":
			seed = "WebLaputa"
		world = World.get_or_insert(seed)
		#client = Client(world=world)
		#client.put()
		#client_id = str(client.key())
		self.response.out.write(json.dumps( {
			"success"  :True,
			#"client_id":client_id,
			"seed"     :seed
			}))
class ChannelDisconnect(webapp2.RequestHandler):
	def post(self):
		client_id = self.request.get("name")
		db.get(db.Key.from_path('Client',client_id)).delete()
class ChannelConnect(webapp2.RequestHandler):
	def post(self):
		"""
		#Just kidding, make the client request each chunk.
		client_id = self.request.get("name")
		client = db.get(db.Key.from_path('Client',client_id))
		world  = db.get(client.world)
		send_around(0,0,0,world,client_id)
		"""
class GetHandler(webapp2.RequestHandler):
	def get(self):
		self.post()
	def post(self):
		#client_id = self.request.get("client_id")
		seed      = self.request.get("seed")
		x         = int(self.request.get("x"))
		y         = int(self.request.get("y"))
		z         = int(self.request.get("z"))
		query = db.Query(Chunk)
		query.filter("x = ",x)
		query.filter("y = ",y)
		query.filter("z = ",z)
		if seed == "":
			return
		world = db.Key.from_path('World',seed)
		query.filter("world = ",world)

		chunk = query.get()
		if not chunk:
			chunk = Chunk(x=x,y=y,z=z,world=world)
			chunk.generate()
			chunk.pack()
			chunk.put()
		else:
			chunk.unpack()
		self.response.out.write(json.dumps(chunk.data))

app = webapp2.WSGIApplication([
	('/',MainPage),
	('/join/(.*)',JoinHandler),
	('/get',GetHandler),
	('/_ah/channel/connected/',ChannelConnect),
	('/_ah/channel/disconnected/',ChannelDisconnect),
	], debug=True)
