const express = require("express");
const multer = require("multer");
const Post = require("../models/post");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

const MIME_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg"
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isValid = MIME_TYPE_MAP[file.mimetype];
        let error = new Error("Invalid mime type");
        if (isValid) error = "null";
        cb(error, "backend/images");
    },
    filename: (req, file, cb) => {
        console.log("tried here");
        const name = file.originalname.toLowerCase().split(" ").join("-");
        const ext = MIME_TYPE_MAP[file.mimetype];
        cb(null, name + "-" + Date.now() + "." + ext);
    }
});

var upload = multer({ storage: storage }).single("image");

//Create post
router.post("", checkAuth, upload, (req, res, next) => {
    const url = req.protocol + "://" + req.get("host");
    const post = new Post({
        title: req.body.title,
        content: req.body.content,
        imagePath: url + "/images/" + req.file.filename,
        creator: req.userData.userId
    });
    post.save()
        .then((createdPost) => {
            res.status(201).json({
                message: "Post added successfully",
                post: {
                    id: createdPost._id,
                    title: createdPost.title,
                    content: createdPost.content,
                    imagePath: createdPost.imagePath,
                    creator: createdPost.creator
                }
            });
        })
        .catch((error) => {
            res.status(500).json({
                message: "Couldn't create the post for some reason"
            });
        });
});

//upload post
router.put("/:id", checkAuth, upload, (req, res, next) => {
    let imagePath = req.body.imagePath;
    if (req.file) {
        const url = req.protocol + "://" + req.get("host");
        imagePath = url + "/images/" + req.file.filename;
    }
    const post = new Post({
        _id: req.body.id,
        title: req.body.title,
        content: req.body.content,
        imagePath: imagePath,
        creator: req.userData.userId
    });
    //Edit post
    Post.updateOne({ _id: req.params.id, creator: req.userData.userId }, post)
        .then((result) => {
            if (result.modifiedCount > 0)
                res.status(200).json({ message: "Updated successfully! :D" });
            else res.status(401).json({ message: "This isn't yours to edit" });
        })
        .catch((error) => {
            res.status(500).json({ message: "Couldn't update....  why?" });
        });
});

//read post
router.get("", (req, res, next) => {
    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    const postQuery = Post.find();
    let fetchedPosts;
    if (pageSize && currentPage) {
        postQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
    }
    postQuery
        .then((documents) => {
            fetchedPosts = documents;
            return Post.count();
        })
        .then((count) => {
            res.status(200).json({
                message: "Posts fetched successfully",
                posts: fetchedPosts,
                maxPosts: count
            });
        });
});

//??????
router.get("/:id", (req, res, next) => {
    Post.findById(req.params.id).then((post) => {
        if (post) {
            res.status(200).json(post);
        } else {
            res.status(404).json({ message: "Post not found!" });
        }
    });
});

//Deleting post
router.delete("/:id", checkAuth, (req, res, next) => {
    Post.deleteOne({ _id: req.params.id, creator: req.userData.userId }).then(
        (result) => {
            if (result.deletedCount > 0)
                res.status(200).json({ message: "Deleted successfully!" });
            else
                res.status(401).json({ message: "This isn't yours to delete" });
        }
    );
});

module.exports = router;
