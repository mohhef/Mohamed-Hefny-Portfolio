export default  function log(req,res){
    res.status(200).json({message: "hello world"});
}