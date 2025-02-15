const router = require('express').Router();
const fs = require('fs');
var multer = require('multer');
const upload = require('../middleware/uploadMiddleware');
const {promisify} = require('util');
const unlinkAsync = promisify(fs.unlink);
var path = require('path');
const cloudinary = require('../cloudinary');
let { Workout, workoutSchema } = require('../models/workout.model');
const { User, userSchema } = require('../models/user.model');
const { Exercise, exerciseSchema } = require('../models/exercise.model');
const config = require("../config.js");
const mongoose = require('mongoose');
const authenticateToken = require('../middleware/authenticateToken');
const sharp = require('sharp');

/*
Error Codes:
200 - OK
400 - general error (look at message for details)
401 - error retrieving workout(s)
402 - cloudinary image upload failed
403 - Failed to authenticate
405 - No Token Provided
494 - User does not have authorization
495 - saving associated user failed
496 - error deleting workout
497 - error saving workout
498 - id provided does not exist in workout collection
499 - error when workout doc was being saved in DB
500 - error performing search on workouts
*/

//--------helper functions--------//
function removeItem(array, val){
  const index = array.indexOf(val);
  if(index > -1) {
    array.splice(index,1);
  }
  return array;
}

const addOwnerToExercises = async (w, ownerId) => {
  const ret = [];

  for(let ex of w.exercises){
    if(ex.owner && ex.owner != ownerId){
      const user = await User.findById(ex.owner);
      let item = {...ex};
      item._doc.ownerName = user.firstName + " " + user.lastName;
      ret.push(item._doc);
    }else{
      ret.push(ex)
    }
  }

  return ret;
}

//------GET-----//

//-----POST-----//

// Create workout
// header.authorization = Bearer "AccessToken"
// req.body = { title, description, exerciseIds, duration, location, tags, muscleGroups, owner }
// req.file = { image }
// (POST) API_Instance.post("workouts/add")
// returns { newWorkout }
router.route('/add').post(authenticateToken, upload.single('image'),async (req,res) => {
  // gather information to add workout into database
  const title = req.body.title;
  const description = req.body.description;
  const owner = req.body.owner;

  if ((owner && req.user._id != owner) && !req.user.isAdmin)
  {
    return res.sendStatus(494);
  }

  var image = null;
  var imageId = null;
  if(req.file){
    var imgPath = __dirname + '/../middleware/temp/';
    await sharp(imgPath + req.file.filename).resize(150, 150)
        .rotate()
        .resize(320,320)
        .toFile(imgPath + req.file.filename + "-cmp");

    await cloudinary.v2.uploader.upload(req.file.path + "-cmp",{folder: "workouts"},function(err, result) {
      if (err)
        return res.status(402).send({Error: err});
      image = result.url;
      imageId = result.public_id;
    });
  } else{
    // Defualt Cloudinary Workout Image, UPDATE IF CHANGED!!
    image = config.DEFAULTWORKIMAGE;
    imageId = config.DEFAULTWORKIMAGEID;
  }

  const exerciseIds = req.body.exerciseIds;
  let exercises = [];

  let tags = [];
	let muscleGroups = [];
  if (exerciseIds)
  {
    for (let i = 0; i < exerciseIds.length; i++)
    {
      let exercise = await Exercise.findById(exerciseIds[i]);

      for (let j = 0; j < exercise.tags.length; j++){
				if (!tags.includes(exercise.tags[j]) && exercise.tags[j]) {
					tags.push(exercise.tags[j]);
				}
			}

			for (let j = 0; j < exercise.muscleGroups.length; j++){
				if (!muscleGroups.includes(exercise.muscleGroups[j]) && exercise.muscleGroups[j]) {
					muscleGroups.push(exercise.muscleGroups[j]);
				}
			}

      exercises.push(exercise);
    }
  }


  const duration = req.body.duration;
  const location = req.body.location;
  muscleGroups = muscleGroups.concat(req.body.muscleGroups);
  
  tags = tags.concat(req.body.tags)
  if (title)
  {
    for (let s of tags.concat(title.split(' ')))
    {
      if (!tags.includes(s))
        tags = tags.concat(s);
    }
  }

  tags.filter(elm => elm);
  muscleGroups.filter(elm => elm);

  const newWorkout = new Workout({
    title,
    description,
    image,
    imageId,
    exercises,
    duration,
    location,
    tags,
    muscleGroups,
    owner
  })

  newWorkout.save()
    .then(async () => {
      if (newWorkout.owner) {
        let user = await User.findById(newWorkout.owner)
        user.customWorkouts.push(newWorkout._id);
        await user.save((err, newUser) => {
          if (err) return res.status(495).send(err);
        });
      }
      res.json(newWorkout);
    })
    .catch(async err => {
      if (newWorkout.imageId != config.DEFAULTWORKIMAGEID) 
      {
        await cloudinary.v2.uploader.destroy(newWorkout.imageId, function() {
          if (err)
            console.log("There was an error deleting the exercise Photo")
          else{
            console.log("Photo deleted");
          }
        });
      }
      res.status(497).send({Error: err})
    });

  if(req.file){
     await unlinkAsync(req.file.path);
     await unlinkAsync(req.file.path + "-cmp");
  }
});

// Search workouts
// header.authorization = Bearer "AccessToken"
// req.body = { searchStr, muscleGroupsSrch, equipmentSrch, ownerId }
// (GET) API_Instance.post("workouts/search")
// returns [{ workouts }]
router.route('/search').post(authenticateToken, async (req, res) => {
  let {searchStr, muscleGroupsSrch, equipmentSrch, ownerId, friendIDs} = req.body;

  if ((ownerId && req.user._id != ownerId) && !req.user.isAdmin)
  {
    return res.sendStatus(494);
  }

  let filters = {};
  filters.$and = [{scheduledDate: {$exists: false}}];
  filters.$or = [{owner: {$exists: false}}];

  if (searchStr)
  {
    searchArr = searchStr.split(' ');
    //console.log(searchStr);
    //console.log(searchArr);
    filters.$and.push({tags: { $in: searchArr}});
  }

  if (muscleGroupsSrch)
    filters.$and.push({muscleGroups: {$in: muscleGroupsSrch}});

  if (equipmentSrch)
    filters.$and.push({tags: {$in: equipmentSrch}});

  if (ownerId) {
    filters.$or.push({owner: mongoose.Types.ObjectId(ownerId)});
  }

  if(friendIDs){
    for(const friendID of friendIDs){
      filters.$or.push({owner: mongoose.Types.ObjectId(friendID)});
    }
  }

  const results  = await Workout.find(filters)
  .catch(err => res.status(500).json('Error: ' + err));

  const ret = [];

  for(let w of results){
    w.exercises = await addOwnerToExercises(w,ownerId);
    if(w.owner && w.owner != ownerId){
      const user = await User.findById(w.owner);
      let item = {...w};
      item._doc.ownerName = user.firstName + " " + user.lastName;
      ret.push(item._doc);
    }else{
      ret.push(w);
    }
  }

  return res.json(ret);
});

//------UPDATE-----//

// Update workout
// header.authorization = Bearer "AccessToken"
// req.body = { title,description,img,exercises,location,recurrence,scheduledDate,
//            dateOfCompletion,owner }
// req.file = { image }
// (PATCH) API_Instance.patch("workouts/{$id}")
// returns { newWorkout }
router.route('/:id').patch(authenticateToken, upload.single('image'), async (req,res) => {
  const id = req.params.id;
  const {title,description,exercises,location,recurrence,scheduledDate,dateOfCompletion} = req.body;

  const workout = await Workout.findById(id);
  if(!workout)
  {
    return res.status(498).send({Error: `Workout ${id} does not exist!`});
  }

  if ((workout.owner && workout.owner != req.user._id) && !req.user.isAdmin)
  {
    return res.sendStatus(494);
  }

  var image = null;
  var imageId = null;
  if(req.file){

    var imgPath = __dirname + '/../middleware/temp/';
    await sharp(imgPath + req.file.filename).resize(150, 150)
        .rotate()
        .resize(320,320)
        .toFile(imgPath + req.file.filename + "-cmp");

    await cloudinary.v2.uploader.upload(req.file.path + "-cmp",{folder: "workouts"},function(err, result) {
      if (err)
        return res.status(401).send({Error: err});
      image = result.url;
      imageId = result.public_id;
      if (workout.imageId != config.DEFAULTWORKIMAGEID)
      {
        cloudinary.v2.uploader.destroy(workout.imageId, function(err, result) {
          if (err)
            console.log("There was an error deleting the workout Photo")
          else{
            console.log("Photo deleted");
          }
        });
      }
    });
  }

  if(title) {workout.title = title;}
  if(description) {workout.description = description;}
  if(image != null) {workout.image = image;}
  if(imageId != null) {workout.imageId = imageId;}
  if(exercises) {workout.exercises = exercises;}
  if(location) {workout.location = location;}
  if(recurrence != null) {workout.recurrence = recurrence;}
  if(scheduledDate) {workout.scheduledDate = scheduledDate;}
  if(dateOfCompletion) {workout.dateOfCompletion = dateOfCompletion;}

  await workout.save((err,newWorkout) => {
    if (err) return res.status(497).send(err);
    res.status(200).json(newWorkout);
  });
  if(req.file){
    await unlinkAsync(req.file.path);
    await unlinkAsync(req.file.path + "-cmp");
 }
});

//------DELETE-----//

// Delete workout
// header.authorization = Bearer "AccessToken"
// req.params { id }
// (DELETE) API_Instance.delete("workouts/{$id}")
// returns `Workout ${deletion.title} deleted!`
router.route('/:id').delete(authenticateToken, async (req,res) => {
  const workout = await Workout.findById(req.params.id);

  if ((workout.owner && workout.owner != req.user._id) && !req.user.isAdmin)
  {
    return res.sendStatus(494);
  }

  if (workout.owner) {
    const user = await User.findById(workout.owner);
    user.customWorkouts = removeItem(user.customWorkouts, workout._id);
    await user.save((err, newUser) => {
      if (err) return res.status(495).send(err);
    });
  }

  if (workout.imageId != config.DEFAULTWORKIMAGEID)
  {
    await cloudinary.v2.uploader.destroy(workout.imageId, function(err, result) {
      if (err)
        console.log("There was an error deleting the workout Photo")
      else{
        console.log("Photo deleted");
      }
    });
  }
  
  Workout.findByIdAndDelete(req.params.id)
    .then(deletion => res.json(`Workout ${deletion.title} deleted!`))
    .catch(err => res.status(496).json('Error: ' + err));
});

module.exports = router;

/* ----- GraveYard ----- */

/*
// Get all workouts
// (GET) http://(baseUrl)/workouts/
// returns [{ workouts }]
//! NEED TO SECURE THIS. NO LONGER SAFE IF ALL
//! USERS STORE PERSONAL STUFF IN THIS COLLECTION
router.route('/').get((req,res) => {
  Workout.find()
    .then(workouts => res.json(workouts))
    .catch(err => res.status(401).json('Error: ' + err));
});

// Get workout by id
// req.params = { workoutId }
// (GET) http://(baseUrl)/workouts/:id
// returns { workout }
//! SECURE THIS ENDPOINT SOME WAY OR WIPE IT OUT
router.route('/:id').get((req, res) => {
  Workout.findById(req.params.id)
    .then(workout => res.json(workout))
    .catch(err => res.status(401).json('Error: ' + err))
});


*/