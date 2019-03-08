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
 * 6. http://tesseract.projectnaptha.com/
 * 7. https://stackoverflow.com/questions/7584794/accessing-jpeg-exif-rotation-data-in-javascript-on-the-client-side/32490603#32490603
 *
 *
 * @todo: refactor this!
 * @todo: first in functions, then classes, then modules
 * @todo: define a loader to load modules dynamically
 * @todo: clean memory up! 
 *
 * **/
 
/**
 *Class ScanModule: module image scan
 *handles processing of input file (from camera or documents)
 * @author Merlin Becker
 * @version 1.0
 * @since 0.2.1
 * @created 08.03.2019
 * @todo: wenn man "nochmal" dr�ckt, soll man zum letzten erfolgreichen User-Input geleitet werden (sofern es mehrer inputs gibt im Ablauf)
**/
class ScanModule{
	constructor(manager,container,card_template){
		this.manager=manager;
		this.container=container;
		this.card_template=card_template;
	}
	setupGUI(){
		console.log("Module Scanner setup gui");
		let content = {title: "Scannen", text: "Fotografiere das Dokument vor einem dunklen Untergrund.","img_placeholder":"1. Scan Document"};
		let html=$(this.card_template(content));
		$(this.container).append(html);
		
		//insert Input Type File
		let source   = document.getElementById("fileinput-template").innerHTML;
		let input_template = Handlebars.compile(source);
		let html2=$(input_template());
		html.find(".card-text").after(html2);
		
		this.input=html.find("#fileinput_scan");
		this.gui=html.find(".card-gui");
		this.loading=html.find(".card-loading");
		this.btn_cancel=html.find(".btn-danger");
		this.btn_success=html.find(".btn-success");
		this.preview_img=html.find(".card-img-top");
		
		this.btn_success.css("display","none");
		this.btn_cancel.css("display","none");
		
		//bind events
		let self=this;
		Holder.run({
			images: self.preview_img[0]
		});
		
		this.btn_cancel.click(function(evt){
			self.manager.moduleUserCancelled(self.manager);
		});
		this.btn_success.click(function(evt){
			self.manager.moduleUserAccepted(self.manager);
		});
		
		html.find(".card-img-top").click(function(evt){
			self.input.click();
		});
		
		this.input.change(function(evt){
			self.startCalculation(evt);
		});
	}	
	showFinishedGUI(){
		console.log("showing finish screen!");
		this.gui.css("display","block");
		this.loading.remove();
		this.btn_cancel.css("display","");
		this.btn_success.css("display","");
	}	
	startCalculation(evt){
		console.log("Processs file!!");
		this.gui.css("display","none");
		this.loading.css("display","block");
		
		this.file=evt.target.files[0];
		this.getOrientation(this.onOrientation);
	}
	getOrientation(callback) {
		var reader = new FileReader();
		var self=this;
		reader.onload = function(event) {
			var view = new DataView(event.target.result);
			if (view.getUint16(0, false) != 0xFFD8) return callback(self,-2);
			var length = view.byteLength,
			offset = 2;
			while (offset < length) {
				var marker = view.getUint16(offset, false);
				offset += 2;

				if (marker == 0xFFE1) {
				if (view.getUint32(offset += 2, false) != 0x45786966) {
					return callback(self,-1);
				}
				var little = view.getUint16(offset += 6, false) == 0x4949;
				offset += view.getUint32(offset + 4, little);
				var tags = view.getUint16(offset, little);
				offset += 2;

				for (var i = 0; i < tags; i++)
					if (view.getUint16(offset + (i * 12), little) == 0x0112)
						return callback(self,view.getUint16(offset + (i * 12) + 8, little));
				}
				else if ((marker & 0xFF00) != 0xFF00) break;
				else offset += view.getUint16(offset, false);
			}
			return callback(self,-1);
			};
			reader.readAsArrayBuffer(this.file.slice(0, 64 * 1024));
	}
	onOrientation(context,orientation){
		var reader = new FileReader();
		reader.onload = function(event) {
			if(orientation==-1||orientation==-2){
				context.calculationFinished(context,event.target.result);
			}
			else{
				context.resetOrientation(event.target.result,orient,context.calculationFinished(context,resetImg));
			}
		};
		reader.readAsDataURL(context.file);
	}	
	resetOrientation(srcBase64, srcOrientation, callback) {
		var img = new Image();	
		img.onload = function() {
			var width = img.width,
			height = img.height,
			canvas = document.createElement('canvas'),
			ctx = canvas.getContext("2d");
			// set proper canvas dimensions before transform & export
			if (4 < srcOrientation && srcOrientation < 9) {
				canvas.width = height;
				canvas.height = width;
			} else {
				canvas.width = width;
				canvas.height = height;
			}

			// transform context before drawing image
			switch (srcOrientation) {
				case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
				case 3: ctx.transform(-1, 0, 0, -1, width, height ); break;
				case 4: ctx.transform(1, 0, 0, -1, 0, height ); break;
				case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
				case 6: ctx.transform(0, 1, -1, 0, height , 0); break;
				case 7: ctx.transform(0, -1, -1, 0, height , width); break;
				case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
				default: break;
			}

			// draw image
			ctx.drawImage(img, 0, 0);

			// export base64
			callback(canvas.toDataURL());
		};
	img.src = srcBase64;
	}
	calculationFinished(context,resultImage){
		context.preview_img.attr("src",resultImage);
		context.manager.moduleFinished(context,resultImage);
		context.showFinishedGUI();
	} 
}
/**********************/



/**
 *Class WorkflowManager: manage workflow
 *manages the chained workflow in the App
 * @author Merlin Becker
 * @version 1.0
 * @since 0.2.1
 * @created 08.03.2019
**/
class WorkflowManager{
	/**
	*instructionchain: array with modules to be called in order
	*playground: html element where to put the modules gui
	*template: path to Handlebars template
	**/
	constructor(instructionchain,playground,template){
		this.chain=instructionchain;
		this.chaincount=0;
		this.playground=$(playground);
		this.template=Handlebars.compile(document.getElementById(template).innerHTML);
		this.current_module=null;
	}
	startNextModule(context=this){
		if(context.chaincount>=context.chain.length){
			alert("fertig!");
			return;
		}
		context.playground.empty();
		
		let next_module_name=context.chain[context.chaincount];
		switch(next_module_name){
			case "scan":
				context.current_module=new ScanModule(context,context.playground,context.template);
			
			default:
				context.current_module=new ScanModule(context,context.playground,context.template);
			
		}
		context.current_module.setupGUI();
	}
	moduleFinished(context,result){
		console.log("WorkFlowManager: The module finished!");
		context.interimresult=result;
		//now go on luke!
	}
	moduleUserCancelled(context){
		console.log("WorkflowManager: The user cancelled the result");
		context.chaincount=0;
		context.startNextModule(context);
	}
	moduleUserAccepted(context){
		console.log("WorkflowManager: The user accepted the result");
		context.chaincount++;
		context.startNextModule(context);
	}
}
 
 
/**********************/
 
 /**********************/
var assets=0;
$(document).ready(function(evt){
	let manager=new WorkflowManager(["scan"],"#scandal_app","card-template");
	manager.startNextModule();
});


function onJsPDFReady(){
	console.log("JsPDF Ready!");
}
function onTesseractReady(){
	console.log("Tesseract Ready!");	
}
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
	//wir k�nnen nicht einfach ein rechteck approximieren, da nicht immer ein geschlossenes Rechteck bei Dokumenten erkannt wird, bzw. auch Ecken fehlen k�nnen
	//wir legen also ein Rechteck um die gr��te Kontur und suchen den n�hesten Punkt von der Kontur zum Rechteck
	
	cv.findContours(edged.clone(),contour,hierachy,cv.RETR_CCOMP,cv.CHAIN_APPROX_SIMPLE);
	delete gray;
	delete edged;
	
	let maxperi=0;
	let cindex=0;
	let white=new cv.Scalar(255,255,255);
	for(let i=0;i<contour.size();++i){
		let cnt=contour.get(i);
		//let peri = cv.arcLength(cnt, true);
		let rotatedRect=cv.minAreaRect(cnt);
		console.log(rotatedRect.size.width);
		let peri = rotatedRect.size.width*rotatedRect.size.height;
		maxperi=Math.max(peri,maxperi);
		if(peri==maxperi){
			cindex=i;
		}
		cv.drawContours(contourimage,contour,i,white,1,cv.LINE_8,hierachy,0);
	}
	let zielkontur=contour.get(cindex);
	let rotatedRect=cv.minAreaRect(zielkontur);
	let vertices=cv.RotatedRect.points(rotatedRect);
	

	let rcolor=new cv.Scalar(0,0,255);
	
	let ycolor=new cv.Scalar(255,255,0);

	let bounds=[];

	for (let i=0;i<4;i++){
		cv.circle(contourimage,vertices[i],3,rcolor,3);
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
	let tl=bounds[0],tr=bounds[1],bl=bounds[3],br=bounds[2];

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
	let points=cv.matFromArray(4,1,cv.CV_32FC2,[tl.x,tl.y,tr.x,tr.y,br.x,br.y,bl.x,bl.y]);
	let M = cv.getPerspectiveTransform(points, trans);
	
	let dsize=new cv.Size(maxWidth,maxHeight);
	let output_image=new cv.Mat();
	cv.warpPerspective(image,output_image,M,dsize,cv.INTER_LINEAR,cv.BORDER_CONSTANT, new cv.Scalar());
	let output_image_gray=new cv.Mat();
	let output_image_thresh=new cv.Mat();
	
	cv.cvtColor(output_image,output_image_gray,cv.COLOR_BGR2GRAY);
	
	cv.threshold(output_image_gray,output_image_thresh,110, 255, cv.THRESH_BINARY);
	
	
	cv.imshow('preview_cropped', output_image_thresh);
	
	detectText('preview_cropped');
	
	output_image_gray.delete();
	output_image_thresh.delete();
	output_image.delete();
	image.delete();
	dst.delete();
}

function nl2br (str, is_xhtml) {
  // @see https://stackoverflow.com/questions/7467840/nl2br-equivalent-in-javascript
  var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br ' + '/>' : '<br>'; // Adjust comment to avoid issue on phpjs.org display

  return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}

function detectText(im){
	
		im=document.getElementById(im);
		console.log("detecting text");
		Tesseract.recognize(im,{lang: 'deu'})
       .progress(function  (p) { console.log('progress', p)    })
       .then(function (result) { console.log('result', result);
								let text=result.text;
								text=nl2br(text);
								$("#preview_tesseract").html(text);
								//createPDF(im)
								})
}
function createPDF(im,text){
	var doc = new jsPDF()
	doc.setFontSize(40)
	doc.text(35, 25, 'Paranyan loves jsPDF')
	doc.addImage(imgData, 'JPEG', 15, 40, 180, 160)
}



