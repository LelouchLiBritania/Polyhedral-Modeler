import { ExactNumber as N } from "exactnumber/dist/index.umd";

class Point3D{
    constructor(x,y,z){
        if(typeof(x)=="number"){
            this.x=N(String(x));
        }
        else{
            this.x = x;
        }

        if(typeof(y)=="number"){
            this.y=N(String(y));
        }
        else{
            this.y = y;
        }

        if(typeof(z)=="number"){
            this.z=N(String(z));
        }
        else{
            this.z = z;
        }
    }
}


class Plane{
    constructor(a,b,c,d){
        if(typeof(a)=="number"){
            this.a=N(String(a));
        }
        else{
            this.a = a;
        }

        if(typeof(b)=="number"){
            this.b=N(String(b));
        }
        else{
            this.b = b;
        }

        if(typeof(c)=="number"){
            this.c=N(String(c));
        }
        else{
            this.c = c;
        }

        if(typeof(d)=="number"){
            this.d=N(String(d));
        }
        else{
            this.d = d;
        }
    }
}


export{Point3D, Plane}