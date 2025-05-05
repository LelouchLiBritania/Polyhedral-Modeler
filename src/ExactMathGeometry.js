import { ExactNumber as N } from "exactnumber/dist/index.umd";


class ExactMathPlane{
    constructor(a,b,c,d){
        if(typeof(a)=="number"){
            this.a = N(String(a));
        }
        else{
            this.a=a;
        }

        if(typeof(b)=="number"){
            this.b = N(String(b));
        }
        else{
            this.b=b;
        }

        if(typeof(c)=="number"){
            this.c = N(String(c));
        }
        else{
            this.c=c;
        }

        if(typeof(d)=="number"){
            this.d = N(String(d));
        }
        else{
            this.d=d;
        }
    }

    /**
     * 
     * @param  {...ExactMathPlane} plans 
     * @returns ExactMathPoint : The point where all the planes intersects,
     * if they intersects in one unique point. Throw an error otherwise.
     */
    static computeIntersectionPoint(...plans){
        if(plans.length<3){
            console.error("Underconstrained plan")
        }
        else{
            ////Gauss-Jordan algorithm
            let A_values = [];
            let D_values = [];
            //Initilisation du système d'équations
            plans.forEach(plan=>{
                A_values.push([plan.a, plan.b, plan.c]);
                D_values.push([plan.d]);
            })

            let A = new ExactMatrix(A_values);
            let D = new ExactMatrix(D_values);

            let res = A.solve(D);
            if(res.l !=0){
                return(new ExactMathPoint(res[0][0].neg(),res[1][0].neg(),res[2][0].neg()));
            }
            else{
                console.error("Planes doen't intersect in one same point");
            }
        }
        return p;
    }
}

class ExactMathPoint{
    constructor(x,y,z){
        if(typeof(x)=="number"){
            this.x = N(String(x));
        }
        else{
            this.x=x;
        }

        if(typeof(y)=="number"){
            this.y = N(String(y));
        }
        else{
            this.y=y;
        }

        if(typeof(z)=="number"){
            this.z = N(String(z));
        }
        else{
            this.z=z;
        }
    }
}

export{
    ExactMathPlane
}