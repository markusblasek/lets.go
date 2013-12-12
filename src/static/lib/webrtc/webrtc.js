/*
* Constants
* */
//Enter the ip and port of the websocket
var server_ip = '192.168.0.150:3000';

//Enter the id of the html video elements to show the video.
//Hint 1: both video elements should have 'autoplay="true"'
//Hint 2: the caller video element should have 'muted="true"' due to the fact you do not like to hear your own voice...
var id_video_caller = 'video_caller';
var id_video_callee = 'video_callee';

//Enter the id of caller and callee. For test purposes the id will be set in the URL as get parameters
var idcaller = getUrlVars()["idcaller"];
var idcallee = getUrlVars()["idcallee"];

//Enter the configuration like stun-servers and ice-servers
var configuration = null;//{ "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] };

//Enter the session constrains of the offer
var sdpConstraints = {'mandatory': {
    'OfferToReceiveAudio':true,
    'OfferToReceiveVideo':true
}};

//Enter the constraints of the stream like resolution etc.
var constraints = {
    "audio": true,
    "video": {
        "mandatory": {
            "minWidth": "320",
            "maxWidth": "320",
            "minHeight": "180",
            "maxHeight": "180",
            "minFrameRate": "30"
        },
        "optional": []
    }
};
/*
 * End: Constants
 * */

//Load the script from the websocket
$.getScript("http://" + server_ip + "/socket.io/socket.io.js", function(){
    $(document).ready(function () {
        video_callee = document.getElementById(id_video_callee);
        video_caller = document.getElementById(id_video_caller);

        socket = io.connect('http://' + server_ip);
        //For test purposes register both clients so the server knows the id of both clients
        socket.emit('register', { 'idcaller': idcaller});
        socket.on('videochat', function (data) {
            trace("received videochat of type '" + data.type + "'");
            //trace(data);
            if(typeof data.type === 'string' && (data.type === 'candidate' || data.type === 'sdp' || data.type === 'callend')){
                if(data.type === 'candidate'){
                    pcLocal.addIceCandidate(new RTCIceCandidate(JSON.parse(data.message)));
                }else if(data.type === 'sdp'){
                    if(!pcLocal){
                        connectChat();
                    }
                    pcLocal.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.message)), function () {
                        // if we received an offer, we need to answer
                        if (pcLocal.remoteDescription.type == 'offer'){
                            pcLocal.createAnswer(localDescCreated, onfailure);
                        }
                    }, onfailure)
                }else if(data.type === 'callend'){
                    trace("Callee stopped video chat.");
                    closeStreamAndPeerConn();
                }else{
                    trace("ERROR: received videochat of not implemented type '" + data.type + "'");
                }
            }else{
                trace("ERROR: received videochat of UNKNOWN type '" + data.type + "'");
            }
        });
    });
});
var video_callee, video_caller;
var pcLocal, localstream;
var socket;

function onfailure(error){
    trace(error);
}

/*Declare the 3 types of messages*/
var videochat_candidate = {'type': 'candidate', 'message': null, 'idcaller': idcaller, 'idcallee': idcallee};
var videochat_sdp = {'type': 'sdp', 'message': null, 'idcaller': idcaller, 'idcallee': idcallee};
var videochat_callend = {'type': 'callend', 'message': null, 'idcaller': idcaller, 'idcallee': idcallee};

function connectChat(){

    pcLocal = new RTCPeerConnection(configuration);
    pcLocal.oniceconnectionstatechange =
        function(evt){
            if(evt.currentTarget.iceConnectionState === 'disconnected'){
                trace("remote peerconnection disconnected");
                closeStreamAndPeerConn();
            }
        };
    pcLocal.onicecandidate = function (evt) {
        if (evt.candidate){
            videochat_candidate.message = JSON.stringify(evt.candidate);
            socket.emit('videochat', videochat_candidate);
        }
    };

    pcLocal.onnegotiationneeded = function () {
        pcLocal.createOffer(localDescCreated, onfailure);
    }

    pcLocal.onaddstream = function (evt) {
        attachMediaStream(video_callee, evt.stream);
    };

    getUserMedia(constraints,
        gotStream, onfailure);

}

function gotStream(stream){
    trace("Received local stream");

    localstream = stream;
    //Attach a stream to a video tag
    attachMediaStream(video_caller, localstream);

    var videoTracks = localstream.getVideoTracks();
    var audioTracks = localstream.getAudioTracks();
    if (videoTracks.length > 0)
        trace('Using Video device: ' + videoTracks[0].label);
    if (audioTracks.length > 0)
        trace('Using Audio device: ' + audioTracks[0].label);

    pcLocal.addStream(localstream);

}

function localDescCreated(desc) {
    pcLocal.setLocalDescription(desc, function () {
        videochat_sdp.message = JSON.stringify(pcLocal.localDescription);
        socket.emit('videochat', videochat_sdp);
    }, onfailure);
}

function closeChat(){
    trace("Ending call");
    socket.emit('videochat', videochat_callend);
    closeStreamAndPeerConn();
}

function closeStreamAndPeerConn(){
    //Close the peerconnection and close the localstream
    pcLocal.close();
    pcLocal = null;
    localstream.stop();
    localstream = null;
    //Reset the video-tags.
    video_callee.src = '';
    video_caller.src = '';
}

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}