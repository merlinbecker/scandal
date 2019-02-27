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

function scaleImage(image,maxWidth=500,maxHeight=500){
	let dst = new cv.Mat();

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
		cv.resize(image, dst, dsize, 0, 0, cv.INTER_AREA);
	}
	else dst=image.clone();
	
	return dst;
}
function findPaper(image){
	let gray=new cv.Mat();
	let edged=new cv.Mat();
	cv.cvtColor(image,gray,cv.COLOR_BGR2GRAY);
	
	let kernel=new cv.Size(5,5);
	cv.GaussianBlur(gray,gray,kernel,0, 0);
	cv.Canny(gray,edged,50, 100,3,false);
	
	let contour=new cv.MatVector();
	let hierachy=new cv.Mat();
	let contourimage=new cv.Mat.zeros(image.rows,image.cols,cv.CV_8UC3);
	//wir können nicht einfach ein rechteck approximieren, da nicht immer ein geschlossenes Rechteck bei Dokumenten erkannt wird, bzw. auch Ecken fehlen können
	//wir legen also ein Rechteck um die größte Kontur und suchen den nähesten Punkt von der Kontur zum Rechteck
	
	cv.findContours(edged.clone(),contour,hierachy,cv.RETR_CCOMP,cv.CHAIN_APPROX_SIMPLE);
	delete gray;
	delete edged;
	
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
		}
		bounds.push(minPoint);

	}
	for(let i=0;i<bounds.length;++i){
		cv.circle(contourimage,bounds[i],4,ycolor,3);
	}

	let color=new cv.Scalar(255,0,0);
	cv.drawContours(contourimage,contour,cindex,color,1,cv.LINE_8,hierachy,0);

	return [contourimage,bounds];
}

function sortPoints(points){
	points.sort((a,b)=>a.y - b.y);
	
	let upperPoints=[points[0],points[1]]
	let lowerPoints=[points[2],points[3]]
	upperPoints.sort((a,b)=>(a.x+a.y) - (b.x+b.y));
	lowerPoints.sort((a,b)=>(a.x+a.y) - (b.x+b.y));	
	points=[upperPoints[0],upperPoints[1],lowerPoints[1],lowerPoints[0]];

	return points;
}

function do_calculation(){
	let image=cv.imread(document.getElementById("inputImage"));
	cv.imshow('preview_img', image);
	let dst=scaleImage(image);
	let result=findPaper(dst);
	let bounds=result[1];
	
	//todo:
	//jetzt die 4 Punkte Transformation vornehmen
	//dann refactorieren
	//https://www.pyimagesearch.com/2014/08/25/4-point-opencv-getperspective-transform-example/
	//sort clockwise
	bounds=sortPoints(bounds);
	
	let gcolor=new Array();
	gcolor[0]=new cv.Scalar(0,255,0);
	gcolor[1]=new cv.Scalar(255,0,0);
	gcolor[2]=new cv.Scalar(255,0,255);
	gcolor[3]=new cv.Scalar(0,255,255);
	for(let i=0;i<4;i++){
		cv.circle(result[0],bounds[i],4,gcolor[i],3);
	}
	let tl=bounds[0],tr=bounds[1],bl=bounds[2],br=bounds[3];

	cv.imshow('preview_detect',result[0]);
	
	let ratio=image.rows/dst.rows;
	tr.x*=ratio;
	tr.y*=ratio;
	tl.x*=ratio;
	tl.y*=ratio;
	bl.x*=ratio;
	bl.y*=ratio;
	br.x*=ratio;
	br.y*=ratio;
	
	//compute the width of the new image, which will be the maximum distance between bottom-right and bottom-left
	//x-coordinates or the top-right and top-left x-coordinates
	let widthA=Math.sqrt(Math.pow((br.x-bl.x),2)+Math.pow((br.y-bl.y),2));
	let widthB=Math.sqrt(Math.pow((tr.x-tl.x),2)+Math.pow((tr.y-tl.y),2));
	let maxWidth=Math.max(Math.trunc(widthA),Math.trunc(widthB));

	//compute the height of the new image, which will be the maximum distance between the top-right and bottom-right
	//y-coordinates or the top-left and bottom-left y-coordinates
	let heightA=Math.sqrt(Math.pow((tr.x-br.x),2)+Math.pow((tr.y-br.y),2));
	let heightB=Math.sqrt(Math.pow((tl.x-bl.x),2)+Math.pow((tl.y-bl.y),2));
	let maxHeight=Math.max(Math.trunc(heightA),Math.trunc(heightB));

	//now that we have the dimensions of the new image, construct the set
	//of destination points to obtain a "birds eye view" of the image,
	//again specifying points in the top-left, top-right, bottom-right and bottom-left
	//order
	console.log("MaxWidth "+maxWidth);
	console.log("MaxHeight "+maxHeight);
	
	let trans=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,maxWidth-1,0,maxWidth-1,maxHeight-1,0,maxHeight-1]);
	let points=cv.matFromArray(4,1,cv.CV_32FC2,[tl.x,tl.y,tr.x,tr.y,bl.x,bl.y,br.x,br.y]);
	let M = cv.getPerspectiveTransform(points, trans);
	
	let dsize=new cv.Size(maxWidth,maxHeight);
	let output_image=new cv.Mat();
	cv.warpPerspective(image,output_image,M,dsize,cv.INTER_LINEAR,cv.BORDER_CONSTANT, new cv.Scalar());
	
	cv.imshow('preview_cropped', output_image);

	output_image.delete();
	image.delete();
	dst.delete();
}




