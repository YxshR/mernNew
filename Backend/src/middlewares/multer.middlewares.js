import multer from "multer"

const storage = multer.diskStorage({
    destination: function(req, file , next) {
        cd(null, "./public/temp")
    },
    filename: function (req, file , next){
        cd(null, file.originalname)
    }
})

export const upload = multer({
    storage,
})