/**
 * Scandal HTML5 document scanner
 * scans a document captured with camera or from image 
 * @author Merlin Becker
 * @version 0.1
 * @since 05.02.2019
 * @references taken from:
 * 1. https://scotch.io/tutorials/introduction-to-computer-vision-in-javascript-using-opencvjs
 * 2. https://www.pyimagesearch.com/2014/09/01/build-kick-ass-mobile-document-scanner-just-5-minutes/
 * 3. https://www.pyimagesearch.com/2014/08/25/4-point-opencv-getperspective-transform-example/
 * 4. https://docs.opencv.org/3.4/dd/d52/tutorial_js_geometric_transformations.html
 *
 * **/
var assets=0;
$(document).ready(function(evt){
	$("#fileInput").change(function(evt){
		$("#inputImage").attr("src",URL.createObjectURL(evt.target.files[0]));
	});
});
function onOpenCvReady(){
	setAssetLoaded();
}
function onImageLoaded(){
	setAssetLoaded();
}
function setAssetLoaded(){
	assets++;
	if (assets>=2){
		do_calculation();
	}
}
function do_calculation(){
	let image=cv.imread(document.getElementById("inputImage"));
	let dst = new cv.Mat();
	let dsize = new cv.Size(300, 300);
	// You can try more different parameters
	cv.resize(image, dst, dsize, 0, 0, cv.INTER_AREA);
	cv.imshow('imageCanvas', dst);
	dst.delete();

	image.delete();
}
