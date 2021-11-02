Daleks.Sound = (function() {

    function Sound(src) {
        var content = window.api.getContent($(src)[0].src);
        var blob = new Blob([content], { type: 'audio/wav' });

        this.audio = new Audio(URL.createObjectURL(blob));
    }

    Sound.prototype = {
        volume: function(volume) {
            this.audio.volume = 0.2
        },

        play: function() {
            this.audio.play()
        },

        volume: function(adjust) {
            this.audio.volume = adjust;
        }

    }

    return Sound;

})();