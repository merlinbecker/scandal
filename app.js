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
 * 5. https://stackoverflow.com/questions/51024864/getting-contours-point-using-opencv-js
 * 
 * @todo: refactor this!
 *
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
	
	let maxWidth=500,maxHeight=500;
	let width = image.size().width;
	let height = image.size().height;
	var shouldResize = (width > maxWidth) || (height > maxHeight);
	if (shouldResize) {
		let newWidth;
		let newHeight;

		if (width > height) {
			newHeight = height * (maxWidth / width);
			newWidth = maxWidth;
		} else {
			newWidth = width * (maxHeight / height);
			newHeight = maxHeight;
		}

		let dsize = new cv.Size(newWidth, newHeight);
		// You can try more different parameters
		cv.resize(image, dst, dsize, 0, 0, cv.INTER_AREA);
	}
	else dst=image.clone();
	

	let gray=new cv.Mat();
	let edged=new cv.Mat();
	cv.cvtColor(dst,gray,cv.COLOR_BGR2GRAY);
	let kernel=new cv.Size(5,5);
	cv.GaussianBlur(gray,gray,kernel,0, 0);
	cv.Canny(gray,edged,50, 100,3,false);
	
	let contour=new cv.MatVector();
	let hierachy=new cv.Mat();
	let contourimage=new cv.Mat.zeros(image.rows,image.cols,cv.CV_8UC3);

	
	//wir können nicht einfach ein rechteck approximieren, da nicht immer ein geschlossenes Rechteck bei Dokumenten erkannt wird, bzw. auch Ecken fehlen können
	//wir legen also ein Rechteck um die Kontur und suchen den nähesten Punkt von der Kontur zum Rechteck

	cv.findContours(edged.clone(),contour,hierachy,cv.RETR_CCOMP,cv.CHAIN_APPROX_SIMPLE);
	let maxperi=0;
	let cindex=0;

	for(let i=0;i<contour.size();++i){
		let cnt=contour.get(i);
		let peri = cv.arcLength(cnt, true);
		maxperi=Math.max(peri,maxperi);
		if(peri==maxperi){
			cindex=i;
		}
	}
	let zielkontur=contour.get(cindex);
	let rotatedRect=cv.minAreaRect(zielkontur);
	let vertices=cv.RotatedRect.points(rotatedRect);
	

	let rcolor=new cv.Scalar(0,0,255);
	let gcolor=new cv.Scalar(0,255,0);
	let ycolor=new cv.Scalar(255,255,0);

	let bounds=[];

	
	for (let i=0;i<4;i++){
		cv.circle(contourimage,vertices[i],3,rcolor,3);
		console.log(vertices[i].x+" "+vertices[i].y);
		let mindist=-1;
		let minPoint=0;
		for(let j=0;j<zielkontur.rows;j++){
			let x=zielkontur.data32S[j*2];
			let y=zielkontur.data32S[j*2+1];
			let center=new cv.Point(x,y);
			
			let a=x-vertices[i].x;
			let b=y-vertices[i].y;
			let dist=Math.sqrt(a*a+b*b);
			if(mindist==-1)
				mindist=dist;
			else mindist=Math.min(mindist,dist);

			if(dist==mindist)
				minPoint=new cv.Point(x,y);

			cv.circle(contourimage,center,3,gcolor,3);
		}
		bounds.push(minPoint);

	}
	for(let i=0;i<bounds.length;++i){
		cv.circle(contourimage,bounds[i],4,ycolor,3);
	}

	let color=new cv.Scalar(255,0,0);
	cv.drawContours(contourimage,contour,cindex,color,1,cv.LINE_8,hierachy,0);

	//todo:
	//jetzt die 4 Punkte Transformation vornehmen
	//https://www.pyimagesearch.com/2014/08/25/4-point-opencv-getperspective-transform-example/
	//
	//
	cv.imshow('imageCanvas', contourimage);

	image.delete();
	dst.delete();
}


