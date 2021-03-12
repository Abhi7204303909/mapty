'use strict';

// const { filter } = require("lodash-es");

class Workout{
     date=new Date();
     id=(Date.now()+'').slice(-10)
     clicks=0;
    constructor(coords,distance,duration){
        this.coords=coords;//[lat,lang]
        this.distance=distance;//in km
        this.duration=duration;//in min
       
        // this.click();
    }
    //type property not accesible for workout object
    //but as we called the methodes in the child class the object created of child class can acces it
    //through scope chain
    _setDescription(){
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
         'September', 'October', 'November', 'December'];
         this.description=`${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
                     }
    click(){
    
        this.clicks++;
    }
}
class Running extends Workout{
    type='running'
    constructor(coords,distance,duration,cadence)
    {
        super(coords,distance,duration);
        this.cadence=cadence
        this.calcPace();//immediatly called when the object is created
        this._setDescription();
    }
    calcPace(){
        //min/km
        this.pace=this.duration/this.distance;
        return this.pace;
    }
}
class Cycling extends Workout{
    type='cycling';
    constructor(coords,distance,duration,elevationGain){
        super(coords,distance,duration);
        this.elevationGain=elevationGain;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed(){
        //km/h
        this.speed=this.distance/(this.duration/60);
        return this.speed;
    }
}
// const run1=new Running([39,-12],5.2,24,178);
// const cycling1=new Cycling([39,-12],27,95,523);
// console.log(run1,cycling1);
/////////////////////////////////////////////////////
//------------------------------------------Application Architecture------------------------------------------
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let sortedState=false;

class App{
    #map;
    #mapEvent;
    _workouts=[];
    #mapZoomLevel=13;

    constructor(){
        //Get users position
        this._getPosition();
        //Get data from local storage
        this._getLocalStorage();
       console.log(this);
        //---------------Displaying marker after user submits the form Feature---------
      form.addEventListener('submit',this._newWorkOut.bind(this));
      inputType.addEventListener('change',this._toggleElevationField);//toggle running or cycling
      containerWorkouts.addEventListener('click',this._moveToPopup.bind(this));
      this.edit();
      this.deleteWorkout();
      this._removeAll();
      this._sortByDistance()
     
    };
    _getPosition(){
        //Geolocation API
        //arguments are
        //two call back functions 1.which will be called on succes after getting current
        //coordinates of the user
        //2.Error callback while getting the current position
        if(navigator.geolocation){
            // console.log(this);
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
                alert('Could not get your position')
            });
            }
    }
    _loadMap(position){
        
           const {latitude}=position.coords;//object destructering
           const {longitude}=position.coords;
        //    console.log(latitude,longitude);
        //    console.log(`https://www.google.com/maps/@${latitude},${longitude}z`);
           const coords=[latitude,longitude];
           this.#map = L.map('map').setView(coords,this.#mapZoomLevel);//string passed to map() function is('map') must be the id name of the element in html where map is displayed
        //   console.log(map);
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        // console.log(this);
        //similar to event listner map.on() is a bulit in leaflet method which helps in adding event listners on map
        //refer leaflet ddocumentation for more information
        //bindPopup()method accepts options as arguments refer bindPopup() method on leaflet documentation
        ///Handling clicks on map   
        this.#map.on('click',this._showForm.bind(this));
        //this is done here istead of
        this._workouts.forEach(work=>{
            this._renderWorkoutMarker(work);
        })     
        
    }
    _showForm(mapE){
          console.log(this);
            this.#mapEvent=mapE;   
            form.classList.remove('hidden');
               inputDistance.focus();//blink cursor when user clicks on the map
            }
    _hideForm(){
        inputDistance.value=inputCadence.value=inputElevation.value=inputDuration.value='';
         form.style.display='none';
        form.classList.add('hidden');
       // form.style.display='grid'
        setInterval(()=>{form.style.display='grid'},1000);
        
    }
    _toggleElevationField(){
    
            inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
            inputCadence.closest('.form__row').classList.toggle('form__row--hidden');        
    }
    _newWorkOut(e){
        const validInputs=function(...inputs){
            //Check if data is valid (Gaurd class)
            return inputs.every(inp=>Number.isFinite(inp));
            
        }
        const allPositive=function(...inputs){ return inputs.every(ip=>ip>0)};
        e.preventDefault()//preventing default behaviour of form
        // console.log(this.#mapEvent);
        //Get data from form
       const type=inputType.value;
       const distance= +inputDistance.value;
       const duration= +inputDuration.value;
       const {lat,lng}=this.#mapEvent.latlng;
    //    console.log(lat,lng);
       let workout;
        
        //If activity running,create running object
         if(type==='running'){
             const cadence= +inputCadence.value;
             if(!validInputs(distance,duration,cadence) || !allPositive(distance,duration,cadence)){
                 return alert('Inputs have to be positive numbers')
             };
             workout=new Running([lat,lng],distance,duration,cadence);
            

         }
        //If activity cycling,create cycling Object
        if(type==='cycling'){
            const elevation= +inputElevation.value;
            if(!validInputs(distance,duration,elevation) || !allPositive(distance,duration)){
                return alert('Inputs have to be positive numbers')
            };
            workout=new Cycling([lat,lng],distance,duration,elevation);
        }
        
        //Add new Object to workout array
        this._workouts.push(workout);
        // console.log(workout);
        //Render workout on map as marker
        this._renderWorkoutMarker(workout);
      
     //Render workout on list
        this._renderWorkout(workout);
        //Hide form +clearing input feilds
        this._hideForm();

        //Set local storage to all workouts
        this._setLocalStorage();
       
   }
   _renderWorkoutMarker(workout)
        { //console.log(workout.distance);
        L.marker(workout.coords).addTo(this.#map)
        .bindPopup(L.popup({maxWidth:250,minWidth:100,autoClose:false,
        closeOnClick:false,className:`${workout.type}-popup ` }))
        .setPopupContent(`${workout.type==='running'?'🏃':'🚴'} ${workout.description}`) 
        .openPopup();
       }
       _renderWorkout(workout){
        let html=`
        <div class="change">
        <button class="button--edit-workout">Edit</button>
        <button class="button--delete-workout">Delete</button>
        </div>
        <li class="workout workout--${workout.type}" data-id=${workout.id}>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
            
            <span class="workout__icon">${workout.type==='running'?'🏃':'🚴'}
            </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
        </div>
        `
        if(workout.type==='running'){
            html+=`
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
            </li>
            `;
            
        }         
        if(workout.type==='cycling'){
            html+=`  
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
           </div>
           <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
           </div>
           </li>
           `;
        }
        form.insertAdjacentHTML('afterend',html);
       }
       _moveToPopup(e){
           const workoutEl=e.target.closest('.workout');//common parent
        //    console.log(workoutEl);
           if(!workoutEl)return; //Gaurd Clause
           const workout=this._workouts.find(work=>work.id===workoutEl.dataset.id);
        //    console.log(workout);
           this.#map.setView(workout.coords,this.#mapZoomLevel,{animate:true,
           pan:{
               duration:1
           }}); //3rd parameter is a option for more refer leaflet documentation;
        //    console.log();
        // workout.click();
       }
       _setLocalStorage(){
           //JSON.stringify(this);->converts object to string
           //local storage should not be used for the large amount of data
           localStorage.setItem('workouts',JSON.stringify(this._workouts));//local stoarge API in the browser
       }
       _getLocalStorage(){
           const data=JSON.parse(localStorage.getItem('workouts'));//JSON.parse converts string back to original object
        //    console.log(data);
           if(!data)return
           this._workouts=data;//restoring data sccross multiple reloads
           this._workouts.forEach(work=>{
               this._renderWorkout(work);

           })
        }
        reset(){
            localStorage.removeItem('workouts');
            location.reload();//location is the big object which hase lot of methodes of browser 
            //here it helps to reload the page
        }
        //-------------New features-----------
        _editHandler(e){
            let editWorkout;
              if(e.target.classList.contains('button--edit-workout'))
                {console.log("targetel",e.target.parentElement.nextElementSibling);
                console.log(this);
                this._showForm();
                const sib=e.target.parentElement.nextElementSibling;
                const targetId=sib.dataset.id
                const res=JSON.parse(localStorage.getItem('workouts'));
                // const inputType=edit[0].parentElement.nextElementSibling.children[0].textContent.split(" ")[0];
               
                let editPos;
                res.forEach(el=>{
                    if(el.id===targetId)editPos=el.coords;
                })
                const editFunc=function(){
                    //e.preventDefault();
                    const inputtype=inputType.value;
                    const newDistance=+inputDistance.value;
                    const newDuration=+inputDuration.value;
                    const newCadence=+inputCadence.value;
                    const newElevation=+inputElevation.value;
                  console.log("i/ptype",inputtype);
                    if(inputtype==='running')editWorkout=new Running(editPos,newDistance,newDuration,newCadence);
                    else{
                        editWorkout=new Cycling(editPos,newDistance,newDuration,newElevation);
                    }
                    // res.forEach((el,i)=>{
                    //     if(el.id===targetId)res[i]=editWorkout;
                    // })
                    for(let i=0;i<res.length;i++){
                        if(res[i].id===targetId)res[i]=editWorkout;
                    }
                    console.log("newres",res);
                    console.log("this handler",this);
                    //this._renderSpinner()
                    
                    this._hideForm();
                    this._renderWorkout(editWorkout);
                   
                    localStorage.removeItem('workouts');
                    //form.style.display='grid'
                    location.reload();
                    localStorage.setItem('workouts',JSON.stringify(res))
                    // app._setLocalStorage();
                    
                 
                    
                }
                form.addEventListener('submit',editFunc.bind(this));}
                
            
        }
        edit(){
        
           // console.log("edit",this);
            const edit=document.querySelector('.workouts');
            console.log("workouts",this._workouts);
            // console.log(edit[0].parentElement.nextElementSibling);
            
             console.log(inputType.value);
            
             
                edit.addEventListener('click',this._editHandler.bind(this));
           
        }

        _deleteHandler(e){
              
            if(e.target.classList.contains('button--delete-workout'))
            { //s e.preventDefault();
                const res=JSON.parse(localStorage.getItem('workouts'));
             console.log(e.target);
                console.log("clicked");
             const sib=e.target.parentElement.nextElementSibling;
             console.log(sib);
             const targetId=sib.dataset.id;
             
             res.forEach((el,i)=>{
                 if(el.id===targetId)res.splice(i,1);
                 
             })
             console.log(res);
             localStorage.removeItem('workouts');
             localStorage.setItem('workouts',JSON.stringify(res));
             //form.style.display='grid'
             location.reload();
       
         }
        }
        deleteWorkout(){
            const del=document.querySelector('.workouts');
         
          console.log("delellll",del);
    
            del.addEventListener('click',this._deleteHandler.bind(this));
                //app._hideForm();
               // console.log("clicked");
               
               
               //location.reload();
        
}
 _removeAll(){
    const btnRemove=document.querySelector('.btn--remove') 
    btnRemove.addEventListener('click',function(){
        localStorage.removeItem('workouts');
        location.reload();
    })
    
 }
 _sortHandler(){
 
    const sortWork=JSON.parse(localStorage.getItem('workouts'));
   // const temp=normalWork.slice();
   // const sortWork=normalWork.slice();
    if(sortedState===false){
        console.log(sortedState);
        sortedState=true;
        sortWork.sort(((a,b)=>a.distance-b.distance));
        localStorage.removeItem('workouts');
        localStorage.setItem('workouts',JSON.stringify(sortWork));
        location.reload();
       // document.querySelector('.workouts').innerHTML='';
        //this._renderWorkout(sortWork);

    }
    else{
        //e.preventDefault();
        console.log("normalWOooork",typeof normalWork);
        console.log(sortedState);
        sortedState=false;
        localStorage.removeItem('workouts');
        localStorage.setItem('workouts',JSON.stringify(this._workouts));
        location.reload();
        //document.querySelector('.workouts').innerHTML='';
        //this._renderWorkout(normalWork);
    }
 //  setTimeout(()=>location.reload(),5000);
    console.log(normalWork);
    console.log(sortWork);
    
    console.log("aftersorting",sortWork);
    

 }
 _sortByDistance(){
 
    const sortBtn=document.querySelector('.btn--sort');
     sortBtn.addEventListener('click',this._sortHandler.bind(this));

 }
}
const app=new App();
//app._sortByDistance();

const normalWork=app._workouts.slice();