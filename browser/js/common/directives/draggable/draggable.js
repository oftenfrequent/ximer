app.directive('draggable', function() {
  return function(scope, element, attrs) {
    // this gives us the native JS object
    var el = element[0];
    
    el.draggable = true;
    
    el.addEventListener('dragstart', function(e) {

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('Text', this.id);
        this.classList.add('drag');

        var idx = scope.track.location.indexOf(parseInt(attrs.position));
        scope.track.location.splice(idx, 1);

        return false;
      },
      false
    );
    
    el.addEventListener('dragend', function(e) {
        this.classList.remove('drag');
        return false;
      },
      false
    );

  }
});

app.directive('droppable', function() {
  return {
    scope: {
      drop: '&' // parent
    },
    link: function(scope, element) {
      // again we need the native object
      var el = element[0];
      
      el.addEventListener('dragover', function(e) {
          e.dataTransfer.dropEffect = 'move';
          // allows us to drop
          if (e.preventDefault) e.preventDefault();
          this.classList.add('over');
          return false;
        },
        false
      );
      
      el.addEventListener('dragenter', function(e) {
          this.classList.add('over');
          return false;
        },
        false
      );
      
      el.addEventListener('dragleave', function(e) {
          this.classList.remove('over');
          return false;
        },
        false
      );
      
      el.addEventListener('drop', function(e) {
          // Stops some browsers from redirecting.
          if (e.stopPropagation) e.stopPropagation();
          
          this.classList.remove('over');
          
          // upon drop, changing position and updating track.location array on scope 
          var item = document.getElementById(e.dataTransfer.getData('Text'));
          var rowId, trackIndex;

          //get trackId of droppable container
          this.classList.forEach(function (name) {
            if(name.includes("track")) {
              trackIndex = name.split("track")[1];
            }
          });
          //get trackId of draggable container
          item.classList.forEach(function (name) {
            if(name.includes("trackLoop")) {
              console.log(name.split("trackLoop")[1]);
              rowId = name.split("trackLoop")[1];
            }
          });
          var xposition = parseInt(this.attributes.xposition.value);
          var childNodes = this.childNodes;
          var oldTimelineId;
          var theCanvas;

          //if rowId = track.indexOf()
          // if()
          console.log('ROWID', rowId, "trackIndex", trackIndex);
          if(parseInt(rowId) === parseInt(trackIndex)) {
            for (var i = 0; i < childNodes.length; i++) {
                if (childNodes[i].className === 'canvas-box') {

                    this.childNodes[i].appendChild(item);
                    scope.$parent.$parent.track.location.push(xposition);
                    scope.$parent.$parent.track.location.sort();

                    var canvasNode = this.childNodes[i].childNodes;

                    for (var j = 0; j < canvasNode.length; j++) {

                        if (canvasNode[j].nodeName === 'CANVAS') {
                            canvasNode[j].attributes.position.value = xposition;
                            oldTimelineId = canvasNode[j].attributes.timelineid.value;
                            theCanvas = canvasNode[j];

                        }
                    }
                }     
            }
            
            console.log('oldTimelineId', oldTimelineId);
            scope.$parent.$parent.moveInTimeline(oldTimelineId, xposition).then(function (newTimelineId) {
                theCanvas.attributes.timelineid.value = newTimelineId;
            });
            
          }

          // call the drop passed drop function
          scope.$apply('drop()');
          
          return false;
        },
        false
      );
    }
  }
});
