!function(){function e(e){return t[parseInt(e,10)]||e}function a(e){var a=parseInt(e,10)-1;return n[a]||e}function r(e){var a=parseInt(e,10)-1;return s[a]||e}var t=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],n=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],s=["January","February","March","April","May","June","July","August","September","October","November","December"],u=[];u.Jan="01",u.Feb="02",u.Mar="03",u.Apr="04",u.May="05",u.Jun="06",u.Jul="07",u.Aug="08",u.Sep="09",u.Oct="10",u.Nov="11",u.Dec="12";var i=function(e){return u[e]||e},c=function(e){var a=e,r="";if(-1!==a.indexOf(".")){var t=a.split(".");a=t[0],r=t[1]}var n=a.split(":");return 3===n.length?(hour=n[0],minute=n[1],second=n[2],{time:a,hour:hour,minute:minute,second:second,millis:r}):{time:"",hour:"",minute:"",second:"",millis:""}},o=function(e,a){for(var r=0,t=a-String(e).length;t>r;r++)e="0"+e;return e},h=function(t,n){"object"==typeof this&&this.constructor==Date&&(n=t,t=this);try{var s=null,u=null,h=null,b=null,d=null,l=null;if("number"==typeof t)return this.date(new Date(t),n);if("function"==typeof t.getFullYear)u=t.getFullYear(),h=t.getMonth()+1,b=t.getDate(),d=t.getDay(),l=c(t.toTimeString());else if(-1!=t.search(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d{0,3}[Z\-+]?(\d{2}:?\d{2})?/)){var y=t.split(/[T\+-]/);u=y[0],h=y[1],b=y[2],l=c(y[3].split(".")[0]),s=new Date(u,h-1,b),d=s.getDay()}else{var y=t.split(" ");switch(y.length){case 6:u=y[5],h=i(y[1]),b=y[2],l=c(y[3]),s=new Date(u,h-1,b),d=s.getDay();break;case 2:var f=y[0].split("-");u=f[0],h=f[1],b=f[2],l=c(y[1]),s=new Date(u,h-1,b),d=s.getDay();break;case 7:case 9:case 10:u=y[3],h=i(y[1]),b=y[2],l=c(y[4]),s=new Date(u,h-1,b),d=s.getDay();break;case 1:var f=y[0].split("");u=f[0]+f[1]+f[2]+f[3],h=f[5]+f[6],b=f[8]+f[9],l=c(f[13]+f[14]+f[15]+f[16]+f[17]+f[18]+f[19]+f[20]),s=new Date(u,h-1,b),d=s.getDay();break;default:return t}}for(var k="",p="",g="",m=0;m<n.length;m++){var M=n.charAt(m);switch(k+=M,g="",k){case"ddd":p+=e(d),k="";break;case"dd":if("d"==n.charAt(m+1))break;p+=o(b,2),k="";break;case"d":if("d"==n.charAt(m+1))break;p+=parseInt(b,10),k="";break;case"D":b+=1==b||21==b||31==b?"st":2==b||22==b?"nd":3==b||23==b?"rd":"th",p+=b,k="";break;case"MMMM":p+=r(h),k="";break;case"MMM":if("M"===n.charAt(m+1))break;p+=a(h),k="";break;case"MM":if("M"==n.charAt(m+1))break;p+=o(h,2),k="";break;case"M":if("M"==n.charAt(m+1))break;p+=parseInt(h,10),k="";break;case"y":case"yyy":if("y"==n.charAt(m+1))break;p+=k,k="";break;case"yy":if("y"==n.charAt(m+1)&&"y"==n.charAt(m+2))break;p+=String(u).slice(-2),k="";break;case"yyyy":p+=u,k="";break;case"HH":p+=o(l.hour,2),k="";break;case"H":if("H"==n.charAt(m+1))break;p+=parseInt(l.hour,10),k="";break;case"hh":var D=0==l.hour?12:l.hour<13?l.hour:l.hour-12;p+=o(D,2),k="";break;case"h":if("h"==n.charAt(m+1))break;var D=0==l.hour?12:l.hour<13?l.hour:l.hour-12;p+=parseInt(D,10),k="";break;case"mm":p+=o(l.minute,2),k="";break;case"m":if("m"==n.charAt(m+1))break;p+=l.minute,k="";break;case"ss":p+=o(l.second.substring(0,2),2),k="";break;case"s":if("s"==n.charAt(m+1))break;p+=l.second,k="";break;case"S":case"SS":if("S"==n.charAt(m+1))break;p+=k,k="";break;case"SSS":p+=l.millis.substring(0,3),k="";break;case"a":p+=l.hour>=12?"PM":"AM",k="";break;case"p":p+=l.hour>=12?"p.m.":"a.m.",k="";break;default:p+=M,k=""}}return p+=g}catch(v){return t}},b=function(e){var a,r,t;return"string"==typeof e&&(a=new Date(e)),"object"==typeof e&&(a=new Date(e.toString())),r=((new Date).getTime()-a.getTime())/1e3,t=Math.floor(r/86400),isNaN(t)||0>t?void 0:t>=31?"more than 31 days":0==t&&(60>r&&"just now"||120>r&&"1 minute ago"||3600>r&&Math.floor(r/60)+" minutes ago"||7200>r&&"1 hour ago"||86400>r&&Math.floor(r/3600)+" hours ago")||1==t&&"Yesterday"||7>t&&t+" days ago"||31>t&&Math.ceil(t/7)+" weeks ago"},d=function(e){var a=new RegExp("^\\d+(\\-|\\/)\\d+(\\-|\\/)\\d+$");if("string"==typeof e){if(a.test(e)||isNaN(Date.parse(e))){var r=e.split(/ |T/),t=r.length>1?r[1].split(/[^\d]/):[0,0,0],n=r[0].split(/[^\d]/);return new Date(n[0]-0,n[1]-1,n[2]-0,t[0]-0,t[1]-0,t[2]-0)}return new Date(e)}return new Date},l=function(e,a){return this.date(e,a||"MM/dd/yyyy")};Date.prototype.format=h,jsmod.util.date={format:h,parse:d,prettyDate:b,toBrowserTimeZone:l}}();