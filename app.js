appid = 'wxfb9f25dc8b4a6d1c'
app_secreat = '97476086a87267c3ab55d51d2fac0ee7'
//var appid="wx9f012a118e552d16";
//var appSecret="7da2d8d4124d23acaed64d8df68e3ff1";
express = require('express');
mongoose = require('mongoose')
WXBizDataCrypt=require("./WXBizDataCrypt");
mongoose.connect('mongodb://localhost/wx')
app = express()
bodyParser = require('body-parser')
app.use(bodyParser.json({limit: '50mb'}))
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
server = app.listen(3000, function () {
 
  var host = server.address().address
  var port = server.address().port
 
  console.log("应用实例，访问地址为 http://%s:%s", host, port)
 
})

https = require('https')  
qs = require('querystring')
crypto = require('crypto')
userSchema = new mongoose.Schema({
	avatarUrl:String,
	nickName:String,
	tags:Array,
	openid: String,
	session_key: String,
	real_key:String,
	step: Number
},{collection: 'users'})
User = mongoose.model('User',userSchema)

postSchema = new mongoose.Schema({
	avatarUrl:String,
	content:String,
	nickName:String,
	number:Number
},{collection: 'posts'})
Post = mongoose.model('Post',postSchema)

commentSchema = new mongoose.Schema({
	content:String,
	nickName:String,
	post_id: String
},{collection: 'comments'})
Comment = mongoose.model('Comment',commentSchema)

app.post('/login', function(req, res){
	if(req.body.code){
		var param = {
			//appid: 'wxfb9f25dc8b4a6d1c',
			//secret: '97476086a87267c3ab55d51d2fac0ee7',
			appid:"wx9f012a118e552d16",
            secret:"7da2d8d4124d23acaed64d8df68e3ff1",
			js_code: req.body.code,
			grant_type: 'authorization_code'
		}
		https.get('https://api.weixin.qq.com/sns/jscode2session?'+qs.stringify(param), (resp) => {
		    let data = ''

		    // A chunk of data has been recieved.
		    resp.on('data', (chunk) => {
	  	        data += chunk
		    })

		    // The whole response has been received. Print out the result.
		    resp.on('end', () => {
		        data = JSON.parse(data)
		        User.findOne({openid:data.openid}, function(err, result){
					if(!err){
						var md5 = crypto.createHash('md5')
						md5.update(data.session_key)
						var cryp = md5.digest('hex')
						if(result){
							result.nickName = req.body.nickName
							result.avatarUrl = req.body.avatarUrl
							result.real_key = data.session_key
							result.session_key = cryp
							result.save(function(err){
								if(err){
									console.log(err.message)
								}
							})
							res.send({new_user:0,sk:cryp})
						}else{
							var newuser = new User({
								nickName: req.body.nickName,
								avatarUrl: req.body.avatarUrl,
								openid: data.openid,
								session_key:cryp,
								real_key:data.session_key,
								step:-1
							})
							newuser.save(function(err){
								if(err){
									console.log(err.message)
								}
							})
							res.send({new_user:1,sk:cryp})
						}
					}else{
						console.log(err.message)
					}
				})
		    })

		}).on("error", (err) => {
		    console.log("Error: " + err.message)
		})
	}
})

app.get('/posts', function(req,res){
	Post.find({},function(err, results){
		if(err){
			console.log(err.message)
			res.send([])
		}else{
			output = []
			if(results){
				results.forEach(function(item, index){
					output.push({
						number: item.number,
						content: item.content,
						name: item.nickName,
						avatar: item.avatarUrl,
						id: item._id
					})
				})
				res.send(output)
			}else{
				res.send([])
			}
		}
	})
})
app.post('/new_post', function(req,res){
	var newpost = new Post({
		nickName: req.body.nickName,
		avatarUrl: req.body.avatarUrl,
		content: req.body.content,
		number: 0
	})
	newpost.save(function(err){
		if(err){
			console.log(err.message)
			res.send({success:0})
		}else{
			res.send({success:1})
		}
	})
})

app.post('/good', function(req, res){
	Post.findById(req.body.id,function(err,result){
		if(!err){
			result.number = result.get("number") + 1
			result.save(function(err1){
				if(err1){
					console.log(err1.message)
					res.send({success:0})	
				}else{
					res.send({success:1})
				}
			})
		}else{
			res.send({success:0})
		}
	})
})


app.post('/comments', function(req, res){
	Comment.find({post_id:req.body.id}, function(err, results){
		if(err){
			console.log(err.message)
			res.send([])
		}else{
			output = []
			if(results){
				results.forEach(function(item, index){
					output.push({
						content: item.content,
						name: item.nickName,
					})
				})
				res.send(output)
			}else{
				res.send([])
			}
		}
	})
})

app.post('/new_comment', function(req, res){
	var new_comment = new Comment({
		nickName: req.body.nickName,
		content: req.body.data,
		post_id: req.body.id
	})
	new_comment.save(function(err){
		if(err){
			console.log(err.message)
			res.send({success:0})
		}else{
			res.send({success:1})
		}
	})
})

app.post('/tags', function(req, res){
	User.findOne({session_key:req.body.sk}, function(err, result){
		if(!err){
			if(result){
				result.tags = req.body.tags
				result.save(function(err){
					if(!err){
						res.send({success:1})
					}else{
						console.log(err.message)
						res.send({success:0})
					}
				})
			}
		}else{
			console.log(err.message)
		}
	})
})

app.post('/runData_in', function(req, res){
	User.findOne({session_key: req.body.sk}, function(err, result){
		if(!err){
			if(result){
				var pc = new WXBizDataCrypt(appid, result.real_key)
      			var data = pc.decryptData(req.body.encryptedData, req.body.iv)
      			result.step = data.stepInfoList[data.stepInfoList.length-1].step
      			result.save(function(err){
      				if(err){
      					console.log(err.message)
      				}
      			})
			}
		}else{
			console.log(err.message)
		}
	})
})

app.get('/runData', function(req, res){
	User.find({}, function(err, results){
		if(!err){
			if(results){
				var out = []
				for(var x in results){
					if(x){
						out.push({
							nickName: results[x].nickName,
							step: results[x].step
						})
					}
				}
				res.send(out)
			}
		}else{
			console.log(err.message)
		}
	})
})