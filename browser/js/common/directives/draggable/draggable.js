app.directive('draggable', function() {
  return function(scope, element) {
    // this gives us the native JS object
    var el = element[0];
    
    el.draggable = true;
    
    el.addEventListener('dragstart', function(e) {

        console.log('dragstart', e);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('Text', this.id);
        this.classList.add('drag');

        return false;
      },
      false
    );
    
    el.addEventListener('dragend', function(e) {
        console.log('dragend');
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
          console.log('dragenter');
          this.classList.add('over');
          return false;
        },
        false
      );
      
      el.addEventListener('dragleave', function(e) {
          console.log('dragleave');
          this.classList.remove('over');
          return false;
        },
        false
      );
      
      el.addEventListener('drop', function(e) {

          console.log('drop', e.toElement);
          // Stops some browsers from redirecting.
          if (e.stopPropagation) e.stopPropagation();
          
          this.classList.remove('over');
          // e.toElement.classList.add('taken');
          
          var item = document.getElementById(e.dataTransfer.getData('Text'));
          this.appendChild(item);
          
          // call the drop passed drop function
          scope.$apply('drop()');
          
          return false;
        },
        false
      );
    }
  }
});
